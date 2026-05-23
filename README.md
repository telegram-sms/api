# cf-kv-storage

A short-lived, encrypted config-transfer relay for the Telegram SMS Android app, built with Cloudflare Workers.

## Purpose

This project acts as a secure relay that allows the web [Config Generator](https://config.telegram-sms.com) and the Android app to exchange already-encrypted configuration blobs via a short, shareable 9-character key.

The Worker itself never sees the configuration in plaintext. Clients send a pre-encrypted `encrypt` field, and the server simply stores and returns this opaque string. Security relies on client-side encryption, short Time-To-Live (TTL), and one-time read constraints.

## Tech Stack

- **Platform:** Cloudflare Workers
- **Router:** itty-router (AutoRouter)
- **Storage:** Workers KV
- **Language:** TypeScript
- **Testing:** Vitest with `@cloudflare/vitest-pool-workers`
- **Deployment:** Wrangler

## HTTP API Reference

### `GET /`
Redirects the user to the main site.
- **Response:** `302 Found` (Redirects to `https://telegram-sms.com`)

### `PUT /config`
Generates a Snowflake key, stores the provided encrypted configuration in the `telegram_config` KV namespace with an expiration TTL of 3600 seconds (1 hour), and returns the generated key.
- **Request Body:**
  ```json
  { "encrypt": "<encrypted_string>" }
  ```
- **Response:** `200 OK`
  ```json
  { "key": "<9-char key>" }
  ```
- **Example:**
  ```bash
  curl -X PUT https://<your-worker-domain>/config \
       -H "Content-Type: application/json" \
       -d '{"encrypt": "opaque_encrypted_blob"}'
  ```

### `GET /config?key=<key>`
Retrieves the stored encrypted value for the given key and immediately DELETES it (one-time read). Returns a `404 Not Found` if the key is missing or expired.
- **Response:** `200 OK` with the opaque encrypted string as the body, or `404 Not Found` if the value is missing.
- **Example:**
  ```bash
  curl "https://<your-worker-domain>/config?key=ABCD12345"
  ```

### `PUT /cc-config` and `GET /cc-config`
These routes behave exactly like their `/config` counterparts but are backed by the `cc_config` KV namespace. They are used specifically for Carbon Copy (CC) config transfers.
- **Example (PUT):**
  ```bash
  curl -X PUT https://<your-worker-domain>/cc-config \
       -H "Content-Type: application/json" \
       -d '{"encrypt": "opaque_encrypted_cc_blob"}'
  ```
- **Example (GET):**
  ```bash
  curl "https://<your-worker-domain>/cc-config?key=WXYZ98765"
  ```

### `POST /log`
Generates a Snowflake key, stores the provided encrypted log data in the `telegram_log` KV namespace, and returns the generated key. Note: There is currently no TTL on this data and no `GET` route to read it back.
- **Request Body:**
  ```json
  { "encrypt": "<encrypted_log_string>" }
  ```
- **Response:** `200 OK`
  ```json
  { "key": "<9-char key>" }
  ```
- **Example:**
  ```bash
  curl -X POST https://<your-worker-domain>/log \
       -H "Content-Type: application/json" \
       -d '{"encrypt": "opaque_encrypted_log_blob"}'
  ```

## KV Bindings

The application uses three Workers KV namespaces:
1. `telegram_config`: Declared in `wrangler.toml`, used for standard config transfers.
2. `cc_config`: Declared in `wrangler.toml`, used for Carbon Copy config transfers.
3. `telegram_log`: Referenced in code (`POST /log`) but is **NOT declared** in `wrangler.toml`.
   > **Note:** This is a known gap. You must bind `telegram_log` in your `wrangler.toml` before the `/log` route will work.

## CORS

CORS is configured via itty-router's `cors()` middleware.
- **Allowed Origins:** `http://localhost:5173` and `https://config.telegram-sms.com`
- **Allowed Methods:** `GET` and `PUT`
- **Allowed Headers:** `Content-Type`

> **Note:** `POST /log` is therefore not reachable cross-origin from the config site under the current `allowMethods`.

## Key Generation Scheme

Keys are generated using `Snowflake.generateKey()`, a singleton class that produces a 9-character base-36 string.
The key is composed of a 21-bit timestamp combined with a 13-bit sequence, right-padded with random characters (`[A-Za-z0-9]`) if it's shorter than 9 characters.
These keys are intentionally short to be human-shareable. They are not cryptographically secret; the security comes from client-side encryption, short TTL, and the one-time read mechanism.

## Development, Testing, and Deployment

### Commands

- `npm run dev`: Start a local development server using `wrangler dev`.
- `npm test`: Run tests using Vitest (`vitest`).
- `npm run deploy`: Deploy the worker using `wrangler deploy`.
- `npm run cf-typegen`: Generate Wrangler types.

### Testing

The existing `test/index.spec.ts` is the stale `create-cloudflare` template (expecting "Hello World!") and does not match the current routes. It needs to be rewritten to reflect the actual functionality.
