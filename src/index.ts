import { AutoRouter } from 'itty-router';
import Snowflake from './snowflake';

const router = AutoRouter();

router.get('/', () => {
	return new Response('Hello Workers', {
		status: 200
	});
});

router.put('/config', async (request, env) => {
	const config = await request.json();
	const snowflake = Snowflake.getInstance();
	const key = snowflake.generateKey();
	await env.telegram_config.put(key, config);
	return new Response(JSON.stringify(
			{ key: key }
		), {
			status: 200
		});
});

router.get('/config', async (request, env) => {
	const config = await env.telegram_config.get(request.query['key']);
	return new Response(config, {
		status: 200
	});
});
export default { ...router };
