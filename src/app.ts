import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'hash-cipher',
	name: 'Hash & Cipher',
	icon: 'lock',
	description: 'Hash or encrypt a string or file using various algorithms',
	overview: ({ mode, input, file_key, base_url, hash, cipher, cipher_key }) => [
		{
			label: 'Mode',
			text: mode === 'file' ? 'File' : 'String',
		},
		{
			label: 'Input',
			text: mode === 'file' ? (file_key ? `${base_url}/${file_key}` : '--') : (input || '--'),
		},
		{
			label: 'Algorithm',
			text: cipher ? `Cipher: ${cipher}` : `Hash: ${hash || 'sha1'}`,
		},
		...(cipher_key ? [{
			label: 'Cipher Key',
			text: '***',
		}] : []),
	],
	options: [
		{
			field: 'mode',
			name: 'Mode',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'select-dropdown',
				required: true,
				options: {
					choices: [
						{ text: 'String', value: 'string' },
						{ text: 'File', value: 'file' },
					],
				},
			},
			schema: {
				default_value: 'string',
			},
		},
		{
			field: 'input',
			name: 'Input String',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				conditions: [
					{
						rule: {
							mode: {
								_eq: 'string',
							},
						},
						hidden: false,
						required: true,
					},
					{
						rule: {
							mode: {
								_neq: 'string',
							},
						},
						hidden: true,
						required: false,
					},
				],
			},
		},
		{
			field: 'file_key',
			name: 'File Key',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				options: {
					placeholder: 'The file key from Directus assets',
				},
				conditions: [
					{
						rule: {
							mode: {
								_eq: 'file',
							},
						},
						hidden: false,
						required: true,
					},
					{
						rule: {
							mode: {
								_neq: 'file',
							},
						},
						hidden: true,
						required: false,
					},
				],
			},
			schema: {
				default_value: '{{ $trigger.key }}',
			},
		},
		{
			field: 'base_url',
			name: 'Base URL',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				options: {
					placeholder: 'https://my-directus.com:<PORT>/assets',
				},
				conditions: [
					{
						rule: {
							mode: {
								_eq: 'file',
							},
						},
						hidden: false,
						required: true,
					},
					{
						rule: {
							mode: {
								_neq: 'file',
							},
						},
						hidden: true,
						required: false,
					},
				],
			},
		},
		{
			field: 'access_token',
			name: 'Access Token',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				conditions: [
					{
						rule: {
							mode: {
								_eq: 'file',
							},
						},
						hidden: false,
						required: false,
					},
					{
						rule: {
							mode: {
								_neq: 'file',
							},
						},
						hidden: true,
						required: false,
					},
				],
			},
		},
		{
			field: 'max_bytes',
			name: 'Header Size (bytes)',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: {
					placeholder: 'Maximum bytes to download for header',
				},
				note: 'Only used when "Download Full File" is disabled',
				conditions: [
					{
						rule: {
							mode: {
								_eq: 'file',
							},
						},
						hidden: false,
						required: true,
					},
					{
						rule: {
							mode: {
								_neq: 'file',
							},
						},
						hidden: true,
						required: false,
					},
				],
			},
			schema: {
				default_value: 262144, // 256KB
			},
		},
		{
			field: 'download_full_file',
			name: 'Download Full File',
			type: 'boolean',
			meta: {
				width: 'half',
				interface: 'boolean',
				options: {
					label: 'Download Full File for Complete Hash',
				},
				note: 'Enable this for complete file hash. Warning: This will download the entire file and may be slower.',
				conditions: [
					{
						rule: {
							mode: {
								_eq: 'file',
							},
						},
						hidden: false,
						required: true,
					},
					{
						rule: {
							mode: {
								_neq: 'file',
							},
						},
						hidden: true,
						required: false,
					},
				],
			},
			schema: {
				default_value: true,
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