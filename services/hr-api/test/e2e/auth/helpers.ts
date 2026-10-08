import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { pool } from '../../../src/db';
import { buildApp, ensureAuthSchema } from '../../../src/app';

export const validBody = {
  name: 'Jordan Lee',
  email: 'jordan.lee@example.com',
  password: 'Fresh2Start',
  dob: '1998-06-15',
};

export async function setupApp(): Promise<FastifyInstance> {
  await ensureAuthSchema(pool);
  const app = buildApp();
  await app.ready();
  return app;
}

export async function resetTables(): Promise<void> {
  await pool.query('TRUNCATE auth_users CASCADE');
}

export async function registerAndVerify(app: FastifyInstance, body = validBody) {
  await request(app.server).post('/auth/register').send(body);
  await pool.query('UPDATE auth_users SET email_verified = TRUE WHERE email = $1', [body.email]);
}

export async function loginCookie(app: FastifyInstance, rememberMe = false, body = validBody) {
  const res = await request(app.server)
    .post('/auth/login')
    .send({ email: body.email, password: body.password, rememberMe });
  return (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
}
