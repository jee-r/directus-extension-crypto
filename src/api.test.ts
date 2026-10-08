import { afterEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
import operation, { formatOutput, performCipher, performHash } from './api.js';

describe('performHash', () => {
	it('hashes with sha1 by default-equivalent vector', () => {
		// echo -n "" | sha1sum
		expect(performHash('', 'sha1').toString('hex')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
	});

	it('hashes a string with sha256', () => {
		// echo -n "abc" | sha256sum
		expect(performHash('abc', 'sha256').toString('hex')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
		);
	});

	it('hashes a Buffer the same way it hashes the equivalent string', () => {
		const fromString = performHash('abc', 'md5');
		const fromBuffer = performHash(Buffer.from('abc', 'utf8'), 'md5');
		expect(fromBuffer.equals(fromString)).toBe(true);
	});

	it('throws for an unknown algorithm', () => {
		expect(() => performHash('abc', 'not-a-real-algorithm')).toThrow();
	});
});

describe('performCipher', () => {
	it('produces output decryptable back to the original plaintext (CBC)', () => {
		const plaintext = 'Secret message';
		const result = performCipher(plaintext, 'aes-256-cbc', 'mySecretKey');

		const iv = result.subarray(0, 16);
		const ciphertext = result.subarray(16);
		const derivedKey = crypto.createHash('sha256').update('mySecretKey').digest();

		const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
		const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

		expect(decrypted.toString('utf8')).toBe(plaintext);
	});

	it('produces output decryptable back to the original plaintext (GCM, with AAD)', () => {
		const plaintext = 'Secret message';
		const result = performCipher(plaintext, 'aes-256-gcm', 'mySecretKey');

		const iv = result.subarray(0, 16);
		const tag = result.subarray(16, 32);
		const ciphertext = result.subarray(32);
		const derivedKey = crypto.createHash('sha256').update('mySecretKey').digest();

		const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv) as crypto.DecipherGCM;
		decipher.setAuthTag(tag);
		decipher.setAAD(Buffer.from('directus', 'utf8'));
		const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

		expect(decrypted.toString('utf8')).toBe(plaintext);
	});

	it('uses a random IV so repeated calls produce different ciphertext', () => {
		const first = performCipher('same input', 'aes-256-cbc', 'key');
		const second = performCipher('same input', 'aes-256-cbc', 'key');
		expect(first.equals(second)).toBe(false);
	});

	it('throws when the GCM auth tag does not match (tampered ciphertext)', () => {
		const result = performCipher('Secret message', 'aes-256-gcm', 'mySecretKey');
		const iv = result.subarray(0, 16);
		const tag = result.subarray(16, 32);
		const tampered = Buffer.from(result.subarray(32));
		tampered[0] = (tampered[0] ?? 0) ^ 0xff;
		const derivedKey = crypto.createHash('sha256').update('mySecretKey').digest();

		const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv) as crypto.DecipherGCM;
		decipher.setAuthTag(tag);
		decipher.setAAD(Buffer.from('directus', 'utf8'));

		expect(() => {
			decipher.update(tampered);
			decipher.final();
		}).toThrow();
	});
});

describe('formatOutput', () => {
	const sample = Buffer.from([0xde, 0xad, 0xbe, 0xef]);

	it('formats as lowercase hex by default', () => {
		expect(formatOutput(sample, 'hex')).toBe('deadbeef');
	});

	it('formats as uppercase hex', () => {
		expect(formatOutput(sample, 'HEX')).toBe('DEADBEEF');
	});

	it('formats as base64', () => {
		expect(formatOutput(sample, 'base64')).toBe(sample.toString('base64'));
	});

	it('falls back to lowercase hex for an unrecognized format', () => {
		expect(formatOutput(sample, 'unknown')).toBe('deadbeef');
	});
});

describe('operation handler (string mode)', () => {
	const context = {} as Parameters<typeof operation.handler>[1];

	it('hashes with sha1 by default when neither hash nor cipher is set', async () => {
		const output = await operation.handler({ input: 'abc' }, context);
		expect(output).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
	});

	it('hashes with the requested algorithm', async () => {
		const output = await operation.handler({ input: 'abc', hash: 'sha256' }, context);
		expect(output).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});

	it('prefers cipher over hash when both are set', async () => {
		const output = (await operation.handler(
			{ input: 'abc', hash: 'sha256', cipher: 'aes-256-cbc', cipher_key: 'k' },
			context,
		)) as string;
		// iv(16 bytes) + at least one ciphertext block = >= 32 bytes = >= 64 hex chars
		expect(output).toMatch(/^[0-9a-f]+$/);
		expect(output.length).toBeGreaterThanOrEqual(64);
	});

	it('throws when input is missing in string mode', async () => {
		await expect(operation.handler({}, context)).rejects.toThrow('Input string is required in string mode');
	});

	it('throws when cipher is set without a cipher_key', async () => {
		await expect(operation.handler({ input: 'abc', cipher: 'aes-256-cbc' }, context)).rejects.toThrow(
			'Cipher key is required when using cipher algorithms',
		);
	});

	it('wraps hash failures with a descriptive message', async () => {
		await expect(operation.handler({ input: 'abc', hash: 'not-a-real-algorithm' }, context)).rejects.toThrow(
			/^Hash 'not-a-real-algorithm' failed:/,
		);
	});

	it('wraps cipher failures with a descriptive message', async () => {
		await expect(
			operation.handler({ input: 'abc', cipher: 'not-a-real-cipher', cipher_key: 'k' }, context),
		).rejects.toThrow(/^Cipher 'not-a-real-cipher' failed:/);
	});
});

describe('operation handler (file mode)', () => {
	const context = {} as Parameters<typeof operation.handler>[1];

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('requires a file_key', async () => {
		await expect(operation.handler({ mode: 'file', base_url: 'https://example.com/assets' }, context)).rejects.toThrow(
			'File key is required in file mode',
		);
	});

	it('requires a base_url', async () => {
		await expect(operation.handler({ mode: 'file', file_key: 'abc-123' }, context)).rejects.toThrow(
			'Base URL is required in file mode',
		);
	});

	it('fetches only a byte range by default and hashes the partial content', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new TextEncoder().encode('file content').buffer,
		});
		vi.stubGlobal('fetch', fetchMock);

		const output = await operation.handler(
			{ mode: 'file', file_key: 'abc-123', base_url: 'https://example.com/assets', max_bytes: 5 },
			context,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			'https://example.com/assets/abc-123',
			expect.objectContaining({ headers: expect.objectContaining({ Range: 'bytes=0-4' }) }),
		);
		expect(output).toBe(performHash('file content', 'sha1').toString('hex'));
	});

	it('includes the bearer token when an access_token is provided', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => new TextEncoder().encode('x').buffer,
		});
		vi.stubGlobal('fetch', fetchMock);

		await operation.handler(
			{
				mode: 'file',
				file_key: 'abc-123',
				base_url: 'https://example.com/assets',
				access_token: 'tok',
				download_full_file: true,
			},
			context,
		);

		expect(fetchMock).toHaveBeenCalledWith(
			'https://example.com/assets/abc-123',
			expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
		);
	});

	it('wraps a failed fetch response in a descriptive error', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }),
		);

		await expect(
			operation.handler({ mode: 'file', file_key: 'missing', base_url: 'https://example.com/assets' }, context),
		).rejects.toThrow('Failed to read file: Failed to fetch file: 404 Not Found');
	});
});
