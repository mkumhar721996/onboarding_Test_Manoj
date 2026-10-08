import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { authRoutes } from './auth/routes';

export { ensureAuthSchema } from './auth/schema';

export function buildApp(): FastifyInstance {
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret && !['development', 'test'].includes(process.env.NODE_ENV ?? 'development')) {
    throw new Error('COOKIE_SECRET must be set');
  }

  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.WEB_APP_ORIGIN ?? 'http://localhost:3011',
    credentials: true,
  });
  app.register(cookie, { secret: cookieSecret ?? 'dev-only-cookie-secret' });

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(authRoutes, { prefix: '/auth' });

  return app;
}
