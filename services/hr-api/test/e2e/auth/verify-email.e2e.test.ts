import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { pool } from '../../../src/db';
import { resetTables, setupApp, validBody } from './helpers';

vi.mock('../../../src/auth/notifications', () => ({
  enqueueVerificationEmail: vi.fn(),
  enqueuePasswordResetEmail: vi.fn(),
}));

describe('email verification', () => {
  let app: FastifyInstance;
  beforeAll(async () => (app = await setupApp()));
  beforeEach(resetTables);
  afterAll(() => app.close());

  const register = () => request(app.server).post('/auth/register').send(validBody);
  const token = async () =>
    (await pool.query('select token from auth_email_verification_tokens')).rows[0].token;

  it('rejects login before verification (AC11/12)', async () => {
    await register();
    const res = await request(app.server)
      .post('/auth/login')
      .send({ email: validBody.email, password: validBody.password });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(
      'We sent a confirmation link to your inbox. Confirm your email, then log in.',
    );
  });

  it('verifies with a valid token and then permits login (AC13/14)', async () => {
    await register();
    const res = await request(app.server).post('/auth/verify-email').send({ token: await token() });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
    const login = await request(app.server)
      .post('/auth/login')
      .send({ email: validBody.email, password: validBody.password });
    expect(login.status).toBe(200);
  });

  it('returns 410 with the email for an expired token and resends (AC15)', async () => {
    await register();
    const t = await token();
    await pool.query(
      "update auth_email_verification_tokens set expires_at = now() - interval '1 minute'",
    );
    const res = await request(app.server).post('/auth/verify-email').send({ token: t });
    expect(res.status).toBe(410);
    expect(res.body.email).toBe(validBody.email);
    const resend = await request(app.server)
      .post('/auth/verify-email/resend')
      .send({ email: validBody.email });
    expect(resend.status).toBe(200);
    expect((await pool.query('select 1 from auth_email_verification_tokens')).rowCount).toBe(2);
  });
});
