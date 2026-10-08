import { describe, it, expect } from 'vitest';
import { decideLogin } from '../../../src/auth/loginPolicy';

const now = new Date('2026-10-08T12:00:00Z');
const base = { passwordMatches: true, emailVerified: true, failedLoginAttempts: 0, lockedUntil: null };

describe('decideLogin', () => {
  it('succeeds for a verified account with the right password', () => {
    expect(decideLogin(base, now)).toEqual({ outcome: 'success' });
  });
  it('rejects a wrong password', () => {
    expect(decideLogin({ ...base, passwordMatches: false, failedLoginAttempts: 1 }, now)).toEqual({
      outcome: 'invalid_credentials',
    });
  });
  it('rejects an unverified account with the right password', () => {
    expect(decideLogin({ ...base, emailVerified: false }, now)).toEqual({ outcome: 'unverified' });
  });
  it('locks for 15 minutes on the 5th consecutive failure', () => {
    expect(
      decideLogin({ ...base, passwordMatches: false, failedLoginAttempts: 4 }, now),
    ).toEqual({ outcome: 'locked_now', unlockAt: new Date(now.getTime() + 15 * 60000) });
  });
  it('rejects during an active lock regardless of credentials', () => {
    const lockedUntil = new Date(now.getTime() + 5 * 60000);
    expect(decideLogin({ ...base, failedLoginAttempts: 5, lockedUntil }, now)).toEqual({
      outcome: 'locked',
      unlockAt: lockedUntil,
    });
  });
  it('allows login once the lock has elapsed', () => {
    const lockedUntil = new Date(now.getTime() - 1000);
    expect(decideLogin({ ...base, failedLoginAttempts: 5, lockedUntil }, now)).toEqual({
      outcome: 'success',
    });
  });
  it('counts failures from zero after an elapsed lock', () => {
    const lockedUntil = new Date(now.getTime() - 1000);
    expect(
      decideLogin({ ...base, passwordMatches: false, failedLoginAttempts: 5, lockedUntil }, now),
    ).toEqual({ outcome: 'invalid_credentials' });
  });
});
