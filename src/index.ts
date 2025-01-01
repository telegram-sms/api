import { AutoRouter } from 'itty-router';
import Snowflake from './snowflake';

const router = AutoRouter();

router.get('/', () => {
	return new Response('Hello Workers', {
		status: 200
	});
});

router.put('/config', async (request, env) => {
	const config: any = await request.json();
	const encryptConfig = config.encrypt;
	const snowflake = Snowflake.getInstance();
	const key = snowflake.generateKey();
	await env.telegram_config.put(key, encryptConfig, { expirationTtl: 3600 });
	return new Response(JSON.stringify(
		{ key: key }
	), {
		status: 20
	});
});

router.get('/config', async (request, env) => {
	const config = await env.telegram_config.get(request.query['key']);
	if (config === null) {
		return new Response('Value not found', { status: 404 });
	}
	await env.telegram_config.delete(request.query['key']);
	return new Response(config, {
		status: 200
	});
});
export default { ...router };
