import { AutoRouter, cors } from 'itty-router';
import Snowflake from './snowflake';

// get preflight and corsify pair
const { preflight, corsify } = cors({
	origin: 'https://telegram-sms.com',
  allowMethods: ['GET', 'PUT'],
  allowHeaders: ['Content-Type']
});

const router = AutoRouter({
  before: [preflight],  // add preflight upstream
  finally: [corsify],   // and corsify downstream
});
/*const router = AutoRouter();*/

router.get('/', () => {
  return new Response('', {
    status: 302,
		headers: {
			'Location': 'https://telegram-sms.com'
		}
  });
});

router.put('/config', async (request, env, context) => {
  const config: any = await request.json();
  const encryptConfig = config.encrypt;
  const snowflake = Snowflake.getInstance();
  const key = snowflake.generateKey();
  await env.telegram_config.put(key, encryptConfig, { expirationTtl: 3600 });
  return new Response(JSON.stringify(
    { key: key }
  ), {
    status: 200
  });
});

router.get('/config', async (request, env, context) => {
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
