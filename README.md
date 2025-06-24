# Directus Operation Crypto
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Directus](https://img.shields.io/badge/directus-%2364f.svg?style=flat&logo=directus&logoColor=white)](https://directus.io/)

A Directus extension that provides cryptographic operations for hashing and encrypting strings within your flows.

## Features

- **Hash Algorithms**: SHA1 (default), SHA256, SHA512, MD5, SHA3-256, BLAKE2b512, and any algorithm supported by Node.js crypto
- **Cipher Algorithms**: AES-128-CBC, AES-192-CBC, AES-256-CBC, AES-256-GCM, ChaCha20-Poly1305, and any cipher supported by Node.js crypto
- **Output Formats**: Hexadecimal (lowercase/uppercase), Base64
- **Flexible Input**: Dropdown selection with custom algorithm input support
- **Smart Logic**: Automatically chooses between hash and cipher operations

## Requirements

- Directus version 10.10.0 or higher

## Installation

```bash
npm install @jee-r/directus-extension-crypto
```

or from Directus market place 


## Usage

### Basic Hashing (Default)

The extension uses **SHA1** by default when no specific algorithm is selected.

**Example**: Hash a password
- Input: `"myPassword123"`
- Hash: (leave empty for SHA1 default)
- Output: `356a192b7913b04c54574d18c28d46e6395428ab`

### Custom Hash Algorithm

**Example**: Use SHA256
- Input: `"Hello World"`
- Hash: `sha256`
- Output: `a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e`

### Encryption with Cipher

**Example**: Encrypt with AES-256-CBC
- Input: `"Secret message"`
- Cipher: `aes-256-cbc`
- Cipher Key: `"mySecretKey"`
- Output: `f4a7b2c8d9e6f3a1b5c9d2e7f8a3b6c4d7e0f9a2b5c8d1e4f7a0b3c6d9e2f5a8...`

## Configuration Options

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| **Input String** | The text to hash or encrypt | Yes | - |
| **Hash Algorithm** | Hash algorithm to use (ignored if cipher is set) | No | `sha1` |
| **Cipher Algorithm** | Cipher algorithm for encryption | No | - |
| **Cipher Key** | Secret key for encryption (required if cipher is set) | Conditional | - |
| **Output Format** | Format of the output | No | `hex` |

## Supported Algorithms

### Hash Algorithms
- `sha1` (default)
- `sha256`
- `sha512` 
- `md5`
- `sha3-256`
- `blake2b512`
- Any algorithm supported by Node.js `crypto.createHash()`

### Cipher Algorithms
- `aes-128-cbc`
- `aes-192-cbc`
- `aes-256-cbc`
- `aes-256-gcm`
- `chacha20-poly1305`
- Any algorithm supported by Node.js `crypto.createCipheriv()`

### Output Formats
- `hex` - Hexadecimal lowercase (default)
- `HEX` - Hexadecimal uppercase
- `base64` - Base64 encoding

## Operation Logic

The extension follows this priority:

1. **If `cipher` is set**: Performs encryption
   - Requires `cipher_key`
   - Ignores `hash` field
   - Automatically generates IV for security
   - For GCM modes: includes authentication tag

2. **If only `hash` is set**: Performs hashing
   - Uses specified hash algorithm

3. **If neither is set**: Uses SHA1 hash (default)

## Security Features

- **Key Derivation**: Cipher keys are automatically hashed with SHA256 to ensure proper length
- **IV Generation**: Random IV is generated for each encryption operation
- **GCM Support**: Proper handling of GCM authentication tags
- **Error Handling**: Clear error messages for unsupported algorithms

## Flow Examples

### API Authentication Hash
Create authentication headers by hashing API key + secret + timestamp:

```
Input: "{{$trigger.body.apiKey}}{{$trigger.body.apiSecret}}{{$trigger.body.timestamp}}"
Hash: "sha1"
Output Format: "HEX"
```

### Secure Data Storage
Encrypt sensitive data before storing:

```
Input: "{{$trigger.body.sensitiveData}}"
Cipher: "aes-256-gcm"
Cipher Key: "{{$env.ENCRYPTION_KEY}}"
Output Format: "base64"
```

### Password Hashing
Hash user passwords:

```
Input: "{{$trigger.body.password}}"
Hash: "sha256"
Output Format: "hex"
```

## Error Handling

The extension provides specific error messages:

- `Input string is required` - No input provided
- `Cipher key is required when using cipher algorithms` - Missing key for encryption
- `Hash 'algorithm' failed: reason` - Invalid hash algorithm
- `Cipher 'algorithm' failed: reason` - Invalid cipher algorithm

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use in your projects.

## Support

For issues and questions:
- Check the Directus documentation
- Review Node.js crypto module documentation
- Open an issue in the repository