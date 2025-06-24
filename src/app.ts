import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'hash-cipher',
	name: 'Hash & Cipher',
	icon: 'lock',
	description: 'Hash or encrypt a string using various algorithms',
	overview: ({ input, hash, cipher, cipher_key }) => [
		{
			label: 'Input',
			text: input || '--',
		},
		{
			label: 'Mode',
			text: cipher ? `Cipher: ${cipher}` : `Hash: ${hash || 'sha1'}`,
		},
		...(cipher_key ? [{
			label: 'Cipher Key',
			text: '***',
		}] : []),
	],
	options: [
		{
			field: 'input',
			name: 'Input String',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				required: true,
			},
		},
		{
			field: 'hash',
			name: 'Hash Algorithm',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown-allow-other',
				options: {
					choices: [
						{ text: 'SHA1 (default)', value: 'sha1' },
						{ text: 'SHA256', value: 'sha256' },
						{ text: 'SHA512', value: 'sha512' },
						{ text: 'MD5', value: 'md5' },
						{ text: 'SHA3-256', value: 'sha3-256' },
						{ text: 'BLAKE2b512', value: 'blake2b512' },
					],
					allowOther: true,
				},
				note: 'Leave empty to use SHA1 by default. Will be ignored if cipher is set.',
			},
		},
		{
			field: 'cipher',
			name: 'Cipher Algorithm',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown-allow-other',
				options: {
					choices: [
						{ text: 'AES-128-CBC', value: 'aes-128-cbc' },
						{ text: 'AES-192-CBC', value: 'aes-192-cbc' },
						{ text: 'AES-256-CBC', value: 'aes-256-cbc' },
						{ text: 'AES-256-GCM', value: 'aes-256-gcm' },
						{ text: 'ChaCha20-Poly1305', value: 'chacha20-poly1305' },
					],
					allowOther: true,
				},
				note: 'If set, will encrypt instead of hash. Requires cipher key.',
			},
		},
		{
			field: 'cipher_key',
			name: 'Cipher Key',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'input',
				note: 'Required for cipher algorithms. Will be hashed to appropriate length.',
			},
		},
		{
			field: 'output_format',
			name: 'Output Format',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: [
						{ text: 'Hexadecimal (lowercase)', value: 'hex' },
						{ text: 'Hexadecimal (uppercase)', value: 'HEX' },
						{ text: 'Base64', value: 'base64' },
					],
				},
			},
			schema: {
				default_value: 'hex',
			},
		},
	],
});