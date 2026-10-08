import type { FastifyInstance, FastifyReply } from 'fastify';
import * as repo from './repository';
import { SESSION_COOKIE, readSessionId, requireSession } from './guard';
import { decideLogin, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS } from './loginPolicy';
import { enqueuePasswordResetEmail, enqueueVerificationEmail } from './notifications';
import { hashPassword, verifyPassword } from './password';
import { REMEMBER_ME_DAYS } from './sessionPolicy';
import { generateToken, isTokenExpired, tokenExpiry } from './tokens';
import { calculateAge, isPasswordValid, isValidEmail } from './validation';

export const MESSAGES = {
  passwordComplexity:
    'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
  duplicateEmail: 'An account with this email already exists. Please log in or reset your password.',
  invalidEmail: 'Enter a valid email address, like name@example.com.',
  underage: 'You must be at least 13 years old to create an account.',
  invalidCredentials: 'Incorrect email or password',
  unverified: 'We sent a confirmation link to your inbox. Confirm your email, then log in.',
  resetGeneric: 'If an account exists with this email, a password reset link has been sent.',
} as const;

const fieldError = (reply: FastifyReply, field: string, message: string) =>
  reply.code(400).send({ field, message });

const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const isProduction = process.env.NODE_ENV === 'production';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? '');
    const dob = String(body.dob ?? '').trim();

    if (!name) return fieldError(reply, 'name', 'Enter your name.');
    if (!email) return fieldError(reply, 'email', 'Enter your email address.');
    if (!password) return fieldError(reply, 'password', 'Enter a password.');
    if (!dob) return fieldError(reply, 'dob', 'Enter your date of birth.');
    if (!isValidEmail(email)) return fieldError(reply, 'email', MESSAGES.invalidEmail);
    if (!isPasswordValid(password)) return fieldError(reply, 'password', MESSAGES.passwordComplexity);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) {
      return fieldError(reply, 'dob', 'Enter a valid date of birth.');
    }
    if (calculateAge(dob) < 13) return fieldError(reply, 'dob', MESSAGES.underage);
    if (await repo.findUserByEmail(email)) {
      return fieldError(reply, 'email', MESSAGES.duplicateEmail);
    }

    let user;
    try {
      user = await repo.createUser({ name, email, passwordHash: await hashPassword(password), dob });
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        return fieldError(reply, 'email', MESSAGES.duplicateEmail);
      }
      throw err;
    }
    const token = generateToken();
    await repo.createEmailVerificationToken(user.id, token, tokenExpiry(24));
    await enqueueVerificationEmail(email, token);
    return reply.code(201).send({ name, email });
  });

  app.post('/verify-email', async (request, reply) => {
    const { token } = (request.body ?? {}) as { token?: string };
    const record = token ? await repo.findVerificationToken(token) : null;
    if (!record) return reply.code(400).send({ message: 'This confirmation link is not valid.' });
    if (isTokenExpired(record.expiresAt)) {
      return reply
        .code(410)
        .send({ message: 'This link has expired. Confirmation links are only valid for 24 hours.', email: record.email });
    }
    await repo.markEmailVerified(record.userId);
    return { message: 'Email verified. Your account is confirmed and ready to use.' };
  });

  app.post('/verify-email/resend', async (request) => {
    const email = normalizeEmail((request.body as { email?: string } | null)?.email);
    const user = email ? await repo.findUserByEmail(email) : null;
    if (user && !user.emailVerified) {
      const token = generateToken();
      await repo.createEmailVerificationToken(user.id, token, tokenExpiry(24));
      await enqueueVerificationEmail(email, token);
    }
    return { message: `A new confirmation link has been sent to ${email}.` };
  });

  app.post('/login', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? '');
    const rememberMe = body.rememberMe === true;
    const invalid = () => reply.code(401).send({ message: MESSAGES.invalidCredentials });

    const user = email ? await repo.findUserByEmail(email) : null;
    if (!user) return invalid();

    const now = new Date();
    const lockElapsed = user.lockedUntil !== null && now.getTime() >= user.lockedUntil.getTime();
    if (lockElapsed) {
      await repo.resetFailedLogins(user.id);
      user.failedLoginAttempts = 0;
    }

    const decision = decideLogin(
      {
        passwordMatches: await verifyPassword(password, user.passwordHash),
        emailVerified: user.emailVerified,
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: lockElapsed ? null : user.lockedUntil,
      },
      now,
    );

    switch (decision.outcome) {
      case 'locked':
        return reply.code(423).send({
          message: `Account still locked. This account is locked until ${formatTime(decision.unlockAt)}.`,
          unlockAt: decision.unlockAt.toISOString(),
        });
      case 'locked_now':
      case 'invalid_credentials': {
        const failures = await repo.recordFailedLogin(user.id);
        if (failures < MAX_FAILED_ATTEMPTS) return invalid();
        const unlockAt = new Date(now.getTime() + LOCKOUT_MINUTES * 60000);
        await repo.lockAccount(user.id, unlockAt);
        return reply.code(423).send({
          message: `Account temporarily locked. Too many failed attempts (locked for ${LOCKOUT_MINUTES} minutes). Try again at ${formatTime(unlockAt)}.`,
          unlockAt: unlockAt.toISOString(),
        });
      }
      case 'unverified':
        return reply.code(401).send({ message: MESSAGES.unverified, code: 'unverified' });
    }

    await repo.resetFailedLogins(user.id);
    const expiresAt = rememberMe
      ? new Date(now.getTime() + REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000)
      : null;
    const sessionId = await repo.createSession({ userId: user.id, rememberMe, expiresAt });
    reply.setCookie(SESSION_COOKIE, sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      signed: true,
      ...(expiresAt ? { expires: expiresAt } : {}),
    });
    return { name: user.name, email: user.email, rememberMe };
  });

  app.get('/session', { preHandler: requireSession }, async (request) => {
    const s = request.authSession!;
    return { name: s.name, email: s.email, rememberMe: s.rememberMe };
  });

  app.post('/logout', async (request, reply) => {
    const id = readSessionId(request);
    const session = id ? await repo.findSession(id) : null;
    if (session) await repo.deleteSession(session.id);
    reply.clearCookie(SESSION_COOKIE, { path: '/', secure: isProduction });
    return { rememberMe: session?.rememberMe ?? false };
  });

  app.post('/forgot-password', async (request) => {
    const email = normalizeEmail((request.body as { email?: string } | null)?.email);
    const user = email ? await repo.findUserByEmail(email) : null;
    if (user) {
      const token = generateToken();
      await repo.createPasswordResetToken(user.id, token, tokenExpiry(1));
      await enqueuePasswordResetEmail(email, token);
    }
    return { message: MESSAGES.resetGeneric };
  });

  app.post('/reset-password', async (request, reply) => {
    const { token, password } = (request.body ?? {}) as { token?: string; password?: string };
    const record = token ? await repo.findResetToken(token) : null;
    if (!record || record.used) {
      return reply.code(400).send({ message: 'This password reset link is not valid.' });
    }
    if (isTokenExpired(record.expiresAt)) {
      return reply.code(410).send({
        message: 'This link has expired. Password reset links are only valid for 1 hour. Request a new one.',
        email: record.email,
      });
    }
    if (!isPasswordValid(String(password ?? ''))) {
      return fieldError(reply, 'password', MESSAGES.passwordComplexity);
    }
    await repo.updateUserPassword(record.userId, await hashPassword(password!));
    await repo.markResetTokenUsed(record.token);
    await repo.invalidateResetTokens(record.userId);
    await repo.deleteUserSessions(record.userId);
    await repo.resetFailedLogins(record.userId);
    return { message: 'Password updated. You can now log in with your new password.' };
  });
}
