import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { pool } from '../../../src/db';
import { loginCookie, registerAndVerify, resetTables, setupApp, validBody } from './helpers';

vi.mock('../../../src/auth/notifications', () => ({
  enqueueVerificationEmail: vi.fn(),
  enqueuePasswordResetEmail: vi.fn(),
}));

describe('password reset', () => {
  let app: FastifyInstance;
  beforeAll(async () => (app = await setupApp()));
  beforeEach(async () => {
    await resetTables();
    await registerAndVerify(app);
  });
  afterAll(() => app.close());

  const forgot = (email: string) => request(app.server).post('/auth/forgot-password').send({ email });
  const token = async () =>
    (await pool.query('select token from auth_password_reset_tokens')).rows[0].token;

  it('creates a reset token for a registered email (AC23)', async () => {
    const res = await forgot(validBody.email);
    expect(res.status).toBe(200);
    expect((await pool.query('select 1 from auth_password_reset_tokens')).rowCount).toBe(1);
  });

  it('returns the same generic message for an unknown email (AC28)', async () => {
    const res = await forgot('nobody@example.com');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      'If an account exists with this email, a password reset link has been sent.',
    );
    expect((await pool.query('select 1 from auth_password_reset_tokens')).rowCount).toBe(0);
  });

  it('updates the password and allows login with it (AC24/25)', async () => {
    await forgot(validBody.email);
    const res = await request(app.server)
      .post('/auth/reset-password')
      .send({ token: await token(), password: 'NewPass1x' });
    expect(res.status).toBe(200);
    const login = await request(app.server)
      .post('/auth/login')
      .send({ email: validBody.email, password: 'NewPass1x' });
    expect(login.status).toBe(200);
  });

  it('rejects an expired token (AC26)', async () => {
    await forgot(validBody.email);
    const t = await token();
    await pool.query("update auth_password_reset_tokens set expires_at = now() - interval '1 minute'");
    const res = await request(app.server)
      .post('/auth/reset-password')
      .send({ token: t, password: 'NewPass1x' });
    expect(res.status).toBe(410);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('revokes existing sessions and clears the lockout on reset', async () => {
    const cookie = await loginCookie(app);
    await pool.query("update auth_users set failed_login_attempts = 5, locked_until = now() + interval '10 minutes'");
    await forgot(validBody.email);
    await request(app.server)
      .post('/auth/reset-password')
      .send({ token: await token(), password: 'NewPass1x' });
    expect((await request(app.server).get('/auth/session').set('Cookie', cookie)).status).toBe(401);
    const row = await pool.query('select locked_until, failed_login_attempts from auth_users');
    expect(row.rows[0].locked_until).toBeNull();
    expect(row.rows[0].failed_login_attempts).toBe(0);
  });
});
