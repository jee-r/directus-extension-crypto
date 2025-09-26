import { defineOperationApi } from '@directus/extensions-sdk';
import crypto from 'crypto';

interface Options {
	mode?: 'string' | 'file';
	input?: string;
	file_key?: string;
	base_url?: string;
	access_token?: string;
	max_bytes?: number;
	download_full_file?: boolean;
	hash?: string;
	cipher?: string;
	cipher_key?: string;
	output_format?: string;
}

export default defineOperationApi<Options>({
	id: 'hash-cipher',
	handler: async ({ 
		mode = 'string', 
		input, 
		file_key, 
		base_url, 
		access_token, 
		max_bytes = 262144,
		download_full_file = false,
		hash, 
		cipher, 
		cipher_key, 
		output_format = 'hex' 
	}) => {
		let dataToProcess: string | Buffer;

		if (mode === 'file') {
			if (!file_key) {
				throw new Error('File key is required in file mode');
			}
			if (!base_url) {
				throw new Error('Base URL is required in file mode');
			}

			try {
				// Construct the asset URL
				const assetUrl = `${base_url}/${file_key}`;
				
				let response: Response;

				if (download_full_file) {
					// Fetch entire file
					response = await fetch(assetUrl, {
						headers: {
							...(access_token && { Authorization: `Bearer ${access_token}` }),
						},
					});
				} else {
					// Use Range header to get only part of the file
					response = await fetch(assetUrl, {
						headers: {
							Range: `bytes=0-${max_bytes - 1}`,
							...(access_token && { Authorization: `Bearer ${access_token}` }),
						},
					});
				}

				if (!response.ok) {
					throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
				}

				// Get array buffer from response
				const arrayBuffer = await response.arrayBuffer();
				// Convert to Buffer for crypto operations
				dataToProcess = Buffer.from(arrayBuffer);

			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Failed to read file: ${message}`);
			}
		} else {
			if (!input) {
				throw new Error('Input string is required in string mode');
			}
			dataToProcess = input;
		}

		// Return early pour cipher
		if (cipher) {
			if (!cipher_key) {
				throw new Error('Cipher key is required when using cipher algorithms');
			}
			
			try {
				const result = performCipher(dataToProcess, cipher, cipher_key);
				return formatOutput(result, output_format);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Cipher '${cipher}' failed: ${message}`);
			}	
		}

		// Default: mode hash
		const algorithm = hash || 'sha1';
		try {
			const result = performHash(dataToProcess, algorithm);
			return formatOutput(result, output_format);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Hash '${algorithm}' failed: ${message}`);
		}
	},
});

function performHash(input: string | Buffer, algorithm: string): Buffer {
	const hash = crypto.createHash(algorithm);
	if (typeof input === 'string') {
		hash.update(input, 'utf8');
	} else {
		hash.update(input);
	}
	return hash.digest();
}

function performCipher(input: string | Buffer, algorithm: string, key: string): Buffer {
    const derivedKey = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(16);

    if (algorithm.includes('gcm')) {
        const cipher = crypto.createCipheriv(algorithm, derivedKey.subarray(0, 32), iv) as crypto.CipherGCM;
        cipher.setAAD(Buffer.from('directus', 'utf8'));
        
        let encrypted: Buffer;
        if (typeof input === 'string') {
            encrypted = cipher.update(input, 'utf8');
        } else {
            encrypted = cipher.update(input);
        }
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const tag = cipher.getAuthTag();
        
        return Buffer.concat([iv, tag, encrypted]);
    } else {
        const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
        let encrypted: Buffer;
        if (typeof input === 'string') {
            encrypted = cipher.update(input, 'utf8');
        } else {
            encrypted = cipher.update(input);
        }
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