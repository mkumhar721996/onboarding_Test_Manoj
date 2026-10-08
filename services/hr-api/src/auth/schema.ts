import type { Pool } from 'pg';

const DDL = `
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  dob DATE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_email_verification_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  remember_me BOOLEAN NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ
);
`;

export async function ensureAuthSchema(pool: Pool): Promise<void> {
  await pool.query(DDL);
}
