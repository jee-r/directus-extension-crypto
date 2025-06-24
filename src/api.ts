import { defineOperationApi } from '@directus/extensions-sdk';
import crypto from 'crypto';

interface Options {
	input: string;
	hash?: string;
	cipher?: string;
	cipher_key?: string;
	output_format?: string;
}

export default defineOperationApi<Options>({
	id: 'hash-cipher',
	handler: ({ input, hash, cipher, cipher_key, output_format = 'hex' }) => {
		if (!input) {
			throw new Error('Input string is required');
		}

		// Return early pour cipher
		if (cipher) {
			if (!cipher_key) {
				throw new Error('Cipher key is required when using cipher algorithms');
			}
			
			try {
				const result = performCipher(input, cipher, cipher_key);
				return formatOutput(result, output_format);
				} catch (error) {
    			const message = error instanceof Error ? error.message : String(error);
    			throw new Error(`Cipher '${cipher}' failed: ${message}`);
				}	
		}

		// Default: mode hash
		const algorithm = hash || 'sha1';
		try {
			const result = performHash(input, algorithm);
			return formatOutput(result, output_format);
		} catch (error) {
    	const message = error instanceof Error ? error.message : String(error);
    	throw new Error(`Hash '${algorithm}' failed: ${message}`);
		}
	},
});

function performHash(input: string, algorithm: string): Buffer {
	return crypto.createHash(algorithm).update(input, 'utf8').digest();
}

function performCipher(input: string, algorithm: string, key: string): Buffer {
    const derivedKey = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(16);

    if (algorithm.includes('gcm')) {
        const cipher = crypto.createCipheriv(algorithm, derivedKey.subarray(0, 32), iv) as crypto.CipherGCM;
        cipher.setAAD(Buffer.from('directus', 'utf8'));
        
        let encrypted = cipher.update(input, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const tag = cipher.getAuthTag();
        
        return Buffer.concat([iv, tag, encrypted]);
    } else {
        const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
        let encrypted = cipher.update(input, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        return Buffer.concat([iv, encrypted]);
    }
}

function formatOutput(result: Buffer, format: string): string {
	switch (format) {
		case 'HEX':
			return result.toString('hex').toUpperCase();
		case 'base64':
			return result.toString('base64');
		case 'hex':
		default:
			return result.toString('hex');
	}
}