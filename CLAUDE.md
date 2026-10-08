# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single Directus **operation extension** (`hash-cipher`) that hashes or encrypts a string or a Directus file asset inside a Directus Flow. It is built with `@directus/extensions-sdk` and published to npm as `@jee-r/directus-extension-crypto`.

## Commands

Use `pnpm` (per global instructions), though CI uses `npm`.

- `pnpm install` — install dependencies
- `pnpm run build` — production build via `directus-extension build` (outputs to `dist/`)
- `pnpm run dev` — watch-mode build, unminified (`directus-extension build -w --no-minify`)
- `pnpm run link` — symlink the built extension into a local Directus instance for manual testing (`directus-extension link`)
- `pnpm run validate` — validates the extension manifest/build via `directus-extension validate`
- `pnpm run changelog` — regenerates `CHANGELOG.md` from conventional commits (`conventional-changelog`)
- `pnpm test` — runs the Vitest suite (`src/api.test.ts`) once
- `pnpm exec vitest` — watch mode; `pnpm exec vitest run -t "<name>"` runs a single test/describe block by name

There is no linter configured in this repo. CI (`.github/workflows/build_test.yml`) runs `npm install && npm run test && npm run build && npm run validate` on every push/PR to non-main/dev branches.

Tests cover the pure helpers in `src/api.ts` (`performHash`, `performCipher`, `formatOutput` — exported solely for testing) plus the full operation `handler`, with `global.fetch` stubbed via `vi.stubGlobal` for file-mode cases. Cipher tests decrypt the handler's output with Node's `crypto` directly rather than asserting fixed ciphertext, since the IV is random per call. There's no way to unit-test the Directus Studio UI (`src/app.ts`) short of running a live instance — validate UI changes by building and linking into a running Directus instance (`pnpm run link`) and exercising the operation in a Flow.

## Architecture

Directus operation extensions have two entry points, both required by the manifest in `package.json` (`directus:extension.source`):

- **`src/api.ts`** — the server-side handler (`defineOperationApi`), registered under the operation id `hash-cipher`. This is where all actual crypto work happens. The build emits it to `dist/api.js`.
- **`src/app.ts`** — the Directus Studio UI definition (`defineOperationApp`): field list shown in the Flow editor (with field-level `conditions` for show/hide/required based on `mode`), plus the `overview` summary shown on the collapsed operation node. Build emits to `dist/app.js`.
- **`src/shims.d.ts`** — ambient module declaration so TypeScript accepts `*.vue` imports (not currently used by any `.vue` file, but required by the SDK's default type environment).

### `api.ts` handler logic (in order)

1. **Input acquisition** — `mode` is either `'string'` (use `input` directly) or `'file'` (fetch a Directus asset by `file_key` from `base_url`, optionally with `access_token` bearer auth). In file mode, by default only the first `max_bytes` (default 256KB) are fetched via an HTTP `Range` header — full-file download requires explicitly enabling `download_full_file`.
2. **Operation selection** — if `cipher` is set, encryption runs (requires `cipher_key`) and `hash` is ignored; otherwise hashing runs with `hash` (default `sha1`).
3. **Cipher details** (`performCipher`) — the `cipher_key` string is SHA256-hashed to derive a fixed-length key; a random 16-byte IV is generated per call. GCM-mode algorithms additionally set/append an AAD (`'directus'`) and auth tag. Output is `iv [+ tag] + ciphertext`, concatenated as a single Buffer, then formatted.
4. **Output formatting** (`formatOutput`) — `hex` (lowercase, default), `HEX` (uppercase), or `base64`.

Any algorithm name accepted by Node's `crypto.createHash` / `crypto.createCipheriv` works, not just the ones listed as dropdown choices in `app.ts` (the UI uses `select-dropdown-allow-other`).

### UI field conditions (`app.ts`)

Fields are shown/hidden and required/optional via paired `conditions` blocks keyed on `mode` (`_eq`/`_neq` 'file'). When adding a new field gated by `mode`, mirror both the "visible when file" and "hidden when not file" condition entries — Directus doesn't auto-invert a single condition.

## Release process

- Releases are tag-triggered (`.github/workflows/release.yml`): pushing a tag builds and publishes to both GitHub Packages and npm (npm via OIDC trusted publishing, no stored token).
- Version/changelog bump is manual via `pnpm run version` (runs `conventional-changelog` and stages `CHANGELOG.md`), consistent with the global conventional-commits requirement for commit messages.
