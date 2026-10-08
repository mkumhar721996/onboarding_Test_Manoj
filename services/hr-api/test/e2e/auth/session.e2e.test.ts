import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { pool } from '../../../src/db';
import { loginCookie, registerAndVerify, resetTables, setupApp } from './helpers';

vi.mock('../../../src/auth/notifications', () => ({
  enqueueVerificationEmail: vi.fn(),
  enqueuePasswordResetEmail: vi.fn(),
}));

describe('GET /auth/session', () => {
  let app: FastifyInstance;
  beforeAll(async () => (app = await setupApp()));
  beforeEach(async () => {
    await resetTables();
    await registerAndVerify(app);
  });
  afterAll(() => app.close());

  const session = (cookie: string) => request(app.server).get('/auth/session').set('Cookie', cookie);

  it('returns the user for an active session (AC17)', async () => {
    const res = await session(await loginCookie(app));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Jordan Lee');
  });

  it('expires a standard session after 31 idle minutes (AC20/21)', async () => {
    const cookie = await loginCookie(app);
    await pool.query("update auth_sessions set last_activity_at = now() - interval '31 minutes'");
    const res = await session(cookie);
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('inactivity');
  });

  it('keeps a remembered session alive while idle (AC22)', async () => {
    const cookie = await loginCookie(app, true);
    await pool.query("update auth_sessions set last_activity_at = now() - interval '5 days'");
    expect((await session(cookie)).status).toBe(200);
  });

  it('expires a remembered session after 30 days (AC29)', async () => {
    const cookie = await loginCookie(app, true);
    await pool.query("update auth_sessions set expires_at = now() - interval '1 minute'");
    const res = await session(cookie);
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('remember');
  });
});
