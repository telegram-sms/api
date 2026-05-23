# cf-kv-storage

This project is a Cloudflare Worker that acts as a short-lived, encrypted config-transfer relay for the Telegram SMS ecosystem. It pairs with the Android app's TransferConfig feature and the web Config Generator, allowing them to exchange already-encrypted configuration blobs securely using a short, shareable 9-character key.

## Build / Dev / Test / Deploy Commands

```bash
# Start local development server
npm run dev

# Run tests
npm test

# Deploy to Cloudflare Workers
npm run deploy

# Generate Wrangler types
npm run cf-typegen
```

## Architecture

- **Entry Point:** A single Worker entry point at `src/index.ts`.
- **Router:** Uses `itty-router` `AutoRouter` with `preflight` and `corsify` for routing and CORS handling.
- **Key Generation:** A Snowflake-inspired key generator in `src/snowflake.ts`.
- **Storage:** Relies on three Workers KV namespaces (`telegram_config`, `cc_config`, `telegram_log`).

## Conventions & Gotchas

- **Opaque Storage:** The server stores opaque pre-encrypted strings only. It never processes or sees plaintext configuration data.
- **One-Time Read & TTL:** The `/config` and `/cc-config` endpoints are one-time-read (data is deleted upon retrieval) and have a 1-hour Time-To-Live (TTL).
- **Log Route:** The `/log` endpoint has no TTL and no corresponding `GET` route for retrieval.
- **Missing Binding:** The `telegram_log` KV namespace is used in the code but is **undeclared** in `wrangler.toml`. It must be added for `/log` to function properly.
- **CORS Limitation:** The `CORS` `allowMethods` is set to `['GET', 'PUT']`, which means `POST /log` is omitted and currently unreachable cross-origin.
- **Stale Tests:** The `test/index.spec.ts` file is a stale template from `create-cloudflare` and does not reflect the current codebase.
