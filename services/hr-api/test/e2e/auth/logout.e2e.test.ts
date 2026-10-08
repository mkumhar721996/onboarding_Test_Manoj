import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { pool } from '../../../src/db';
import { loginCookie, registerAndVerify, resetTables, setupApp } from './helpers';

vi.mock('../../../src/auth/notifications', () => ({
  enqueueVerificationEmail: vi.fn(),
  enqueuePasswordResetEmail: vi.fn(),
}));

describe('POST /auth/logout', () => {
  let app: FastifyInstance;
  beforeAll(async () => (app = await setupApp()));
  beforeEach(async () => {
    await resetTables();
    await registerAndVerify(app);
  });
  afterAll(() => app.close());

  it.each([
    ['remembered', true],
    ['standard', false],
  ])('invalidates a %s session (AC32-35)', async (_label, rememberMe) => {
    const cookie = await loginCookie(app, rememberMe);
    const res = await request(app.server).post('/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.rememberMe).toBe(rememberMe);
    expect((await pool.query('select 1 from auth_sessions')).rowCount).toBe(0);
    const after = await request(app.server).get('/auth/session').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });
});
