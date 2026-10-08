import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { pool } from '../../../src/db';
import { registerAndVerify, resetTables, setupApp, validBody } from './helpers';

vi.mock('../../../src/auth/notifications', () => ({
  enqueueVerificationEmail: vi.fn(),
  enqueuePasswordResetEmail: vi.fn(),
}));

describe('POST /auth/login', () => {
  let app: FastifyInstance;
  beforeAll(async () => (app = await setupApp()));
  beforeEach(async () => {
    await resetTables();
    await registerAndVerify(app);
  });
  afterAll(() => app.close());

  const login = (password = validBody.password) =>
    request(app.server).post('/auth/login').send({ email: validBody.email, password });

  it('logs in with correct credentials and sets a cookie (AC16)', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects incorrect credentials (AC18/19)', async () => {
    const res = await login('WrongPass1');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password');
  });

  it('locks on the 5th failure and stays locked (AC36-39)', async () => {
    for (let i = 0; i < 4; i++) expect((await login('WrongPass1')).status).toBe(401);
    const fifth = await login('WrongPass1');
    expect(fifth.status).toBe(423);
    expect(fifth.body.message).toMatch(/temporarily locked/i);
    expect(fifth.body.unlockAt).toBeDefined();
    const during = await login();
    expect(during.status).toBe(423);
    expect(during.body.message).toMatch(/still locked/i);
    expect(during.body.unlockAt).toBeDefined();
  });

  it('logs in after the lock elapses and clears lock state (AC40)', async () => {
    for (let i = 0; i < 5; i++) await login('WrongPass1');
    await pool.query("update auth_users set locked_until = now() - interval '1 minute'");
    const res = await login();
    expect(res.status).toBe(200);
    const row = await pool.query('select locked_until, failed_login_attempts from auth_users');
    expect(row.rows[0].locked_until).toBeNull();
    expect(row.rows[0].failed_login_attempts).toBe(0);
  });

  it('locks after 5 concurrent wrong-password attempts', async () => {
    await Promise.all(Array.from({ length: 5 }, () => login('WrongPass1')));
    const row = await pool.query('select locked_until from auth_users');
    expect(row.rows[0].locked_until).not.toBeNull();
    expect((await login()).status).toBe(423);
  });
});
