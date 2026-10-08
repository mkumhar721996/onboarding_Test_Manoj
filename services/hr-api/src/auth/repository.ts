import { randomUUID } from 'node:crypto';
import { pool } from '../db';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface TokenRecord {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  used?: boolean;
}

export interface SessionRecord {
  id: string;
  userId: string;
  rememberMe: boolean;
  lastActivityAt: Date;
  expiresAt: Date | null;
  name: string;
  email: string;
}

const USER_COLUMNS =
  'id, name, email, password_hash, email_verified, failed_login_attempts, locked_until';

function toUser(row: any): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    emailVerified: row.email_verified,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
  };
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  dob: string;
}): Promise<AuthUser> {
  const { rows } = await pool.query(
    `INSERT INTO auth_users (id, name, email, password_hash, dob)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${USER_COLUMNS}`,
    [randomUUID(), input.name, input.email, input.passwordHash, input.dob],
  );
  return toUser(rows[0]);
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM auth_users WHERE email = $1`, [
    email,
  ]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function markEmailVerified(userId: string): Promise<void> {
  await pool.query('UPDATE auth_users SET email_verified = TRUE WHERE id = $1', [userId]);
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await pool.query('UPDATE auth_users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
}

// Atomic increment so concurrent wrong-password requests cannot slip past the lockout threshold.
export async function recordFailedLogin(userId: string): Promise<number> {
  const { rows } = await pool.query(
    `UPDATE auth_users SET failed_login_attempts = failed_login_attempts + 1
     WHERE id = $1 RETURNING failed_login_attempts`,
    [userId],
  );
  return rows[0].failed_login_attempts;
}

export async function resetFailedLogins(userId: string): Promise<void> {
  await pool.query(
    'UPDATE auth_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [userId],
  );
}

export async function lockAccount(userId: string, until: Date): Promise<void> {
  await pool.query('UPDATE auth_users SET locked_until = $2 WHERE id = $1', [userId, until]);
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await pool.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
}

export async function invalidateResetTokens(userId: string): Promise<void> {
  await pool.query('UPDATE auth_password_reset_tokens SET used = TRUE WHERE user_id = $1', [userId]);
}

async function createToken(
  table: 'auth_email_verification_tokens' | 'auth_password_reset_tokens',
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(`INSERT INTO ${table} (token, user_id, expires_at) VALUES ($1, $2, $3)`, [
    token,
    userId,
    expiresAt,
  ]);
}

export const createEmailVerificationToken = (userId: string, token: string, expiresAt: Date) =>
  createToken('auth_email_verification_tokens', userId, token, expiresAt);

export const createPasswordResetToken = (userId: string, token: string, expiresAt: Date) =>
  createToken('auth_password_reset_tokens', userId, token, expiresAt);

function toToken(row: any): TokenRecord {
  return {
    token: row.token,
    userId: row.user_id,
    email: row.email,
    expiresAt: row.expires_at,
    used: row.used,
  };
}

export async function findVerificationToken(token: string): Promise<TokenRecord | null> {
  const { rows } = await pool.query(
    `SELECT t.token, t.user_id, t.expires_at, u.email
     FROM auth_email_verification_tokens t JOIN auth_users u ON u.id = t.user_id
     WHERE t.token = $1`,
    [token],
  );
  return rows[0] ? toToken(rows[0]) : null;
}

export async function findResetToken(token: string): Promise<TokenRecord | null> {
  const { rows } = await pool.query(
    `SELECT t.token, t.user_id, t.expires_at, t.used, u.email
     FROM auth_password_reset_tokens t JOIN auth_users u ON u.id = t.user_id
     WHERE t.token = $1`,
    [token],
  );
  return rows[0] ? toToken(rows[0]) : null;
}

export async function markResetTokenUsed(token: string): Promise<void> {
  await pool.query('UPDATE auth_password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
}

export async function createSession(input: {
  userId: string;
  rememberMe: boolean;
  expiresAt: Date | null;
}): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, remember_me, last_activity_at, expires_at)
     VALUES ($1, $2, $3, now(), $4)`,
    [id, input.userId, input.rememberMe, input.expiresAt],
  );
  return id;
}

export async function findSession(id: string): Promise<SessionRecord | null> {
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.remember_me, s.last_activity_at, s.expires_at, u.name, u.email
     FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id WHERE s.id = $1`,
    [id],
  );
  const r = rows[0];
  return r
    ? {
        id: r.id,
        userId: r.user_id,
        rememberMe: r.remember_me,
        lastActivityAt: r.last_activity_at,
        expiresAt: r.expires_at,
        name: r.name,
        email: r.email,
      }
    : null;
}

export async function touchSessionActivity(id: string): Promise<void> {
  await pool.query('UPDATE auth_sessions SET last_activity_at = now() WHERE id = $1', [id]);
}

export async function deleteSession(id: string): Promise<void> {
  await pool.query('DELETE FROM auth_sessions WHERE id = $1', [id]);
}
