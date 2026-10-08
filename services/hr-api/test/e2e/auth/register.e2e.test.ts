import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { pool } from '../../../src/db';
import { resetTables, setupApp, validBody } from './helpers';

vi.mock('../../../src/auth/notifications', () => ({
  enqueueVerificationEmail: vi.fn(),
  enqueuePasswordResetEmail: vi.fn(),
}));

describe('POST /auth/register', () => {
  let app: FastifyInstance;
  beforeAll(async () => (app = await setupApp()));
  beforeEach(resetTables);
  afterAll(() => app.close());

  const post = (body: object) => request(app.server).post('/auth/register').send(body);

  it('creates an account and returns the success payload (AC1/2)', async () => {
    const res = await post(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: validBody.name, email: validBody.email });
    const row = await pool.query('select 1 from auth_users where email = $1', [validBody.email]);
    expect(row.rowCount).toBe(1);
  });

  it('rejects a missing password with a message (AC3/4)', async () => {
    const res = await post({ ...validBody, password: '' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ field: 'password', message: 'Enter a password.' });
    expect((await pool.query('select 1 from auth_users')).rowCount).toBe(0);
  });

  it('rejects a weak password (AC5/6)', async () => {
    const res = await post({ ...validBody, password: 'weakpass' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
    );
  });

  it('rejects a duplicate email (AC7/8)', async () => {
    await post(validBody);
    const res = await post(validBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'An account with this email already exists. Please log in or reset your password.',
    );
  });

  it('rejects under-13 users (AC9/10)', async () => {
    const res = await post({ ...validBody, dob: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('You must be at least 13 years old to create an account.');
  });

  it('rejects a malformed email (AC30/31)', async () => {
    const res = await post({ ...validBody, email: 'alex.rivera[at]example.com' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      field: 'email',
      message: 'Enter a valid email address, like name@example.com.',
    });
  });
});
