// test/index.spec.ts
import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import Snowflake from '../src/snowflake';

const BASE = 'https://example.com';
const CONFIG_ORIGIN = 'https://config.telegram-sms.com';

// Helper: PUT an encrypted blob and return the generated key.
async function putConfig(path: '/config' | '/cc-config', payload: string): Promise<string> {
	const res = await SELF.fetch(`${BASE}${path}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ encrypt: payload }),
	});
	expect(res.status).toBe(200);
	const body = (await res.json()) as { key: string };
	return body.key;
}

describe('GET /', () => {
	it('redirects to telegram-sms.com', async () => {
		const res = await SELF.fetch(BASE, { redirect: 'manual' });
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toBe('https://telegram-sms.com');
	});
});

describe.each([
	{ path: '/config' as const, name: 'config' },
	{ path: '/cc-config' as const, name: 'cc-config' },
])('$name transfer', ({ path }) => {
	it('PUT stores the blob and returns a 9-char key', async () => {
		const key = await putConfig(path, 'opaque-encrypted-blob');
		expect(typeof key).toBe('string');
		expect(key).toHaveLength(9);
	});

	it('GET returns the exact stored blob', async () => {
		const payload = 'payload-for-' + path;
		const key = await putConfig(path, payload);

		const res = await SELF.fetch(`${BASE}${path}?key=${key}`);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe(payload);
	});

	it('GET is one-time: a second read returns 404', async () => {
		const key = await putConfig(path, 'single-use');

		const first = await SELF.fetch(`${BASE}${path}?key=${key}`);
		expect(first.status).toBe(200);

		const second = await SELF.fetch(`${BASE}${path}?key=${key}`);
		expect(second.status).toBe(404);
		expect(await second.text()).toBe('Value not found');
	});

	it('GET with an unknown key returns 404', async () => {
		const res = await SELF.fetch(`${BASE}${path}?key=does-not-exist`);
		expect(res.status).toBe(404);
		expect(await res.text()).toBe('Value not found');
	});

	it('keeps the two namespaces isolated from each other', async () => {
		const other = path === '/config' ? '/cc-config' : '/config';
		const key = await putConfig(path, 'namespaced');

		// The key only exists in `path`'s namespace, not the sibling route's.
		const cross = await SELF.fetch(`${BASE}${other}?key=${key}`);
		expect(cross.status).toBe(404);
	});
});

describe('CORS', () => {
	it('reflects the allowed config-site origin on a PUT', async () => {
		const res = await SELF.fetch(`${BASE}/config`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Origin: CONFIG_ORIGIN },
			body: JSON.stringify({ encrypt: 'cors-check' }),
		});
		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(CONFIG_ORIGIN);
	});

	it('answers an OPTIONS preflight for an allowed origin/method', async () => {
		const res = await SELF.fetch(`${BASE}/config`, {
			method: 'OPTIONS',
			headers: {
				Origin: CONFIG_ORIGIN,
				'Access-Control-Request-Method': 'PUT',
				'Access-Control-Request-Headers': 'Content-Type',
			},
		});
		expect(res.status).toBeLessThan(300);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(CONFIG_ORIGIN);
		expect(res.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
	});

	it('does not reflect a disallowed origin', async () => {
		const res = await SELF.fetch(BASE, {
			headers: { Origin: 'https://evil.example.com' },
			redirect: 'manual',
		});
		expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.example.com');
	});
});

describe('Snowflake.generateKey', () => {
	const snowflake = Snowflake.getInstance();

	it('is a singleton', () => {
		expect(Snowflake.getInstance()).toBe(snowflake);
	});

	it('produces 9-character keys from the expected alphabet', () => {
		const key = snowflake.generateKey();
		expect(key).toHaveLength(9);
		expect(key).toMatch(/^[A-Za-z0-9]{9}$/);
	});

	it('produces unique keys across a tight burst', () => {
		// Stays well under the 13-bit (8192) per-ms sequence ceiling, so this
		// only exercises short-term uniqueness — not timestamp wrap-around.
		const count = 5000;
		const keys = new Set<string>();
		for (let i = 0; i < count; i++) {
			keys.add(snowflake.generateKey());
		}
		expect(keys.size).toBe(count);
	});
});
