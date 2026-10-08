import { describe, it, expect } from 'vitest';
import { isSessionExpired } from '../../../src/auth/sessionPolicy';

const now = new Date('2026-10-08T12:00:00Z');
const ago = (min: number) => new Date(now.getTime() - min * 60000);

describe('isSessionExpired', () => {
  it('expires a standard session after 31 idle minutes', () => {
    expect(isSessionExpired({ rememberMe: false, lastActivityAt: ago(31), expiresAt: null }, now)).toBe(true);
  });
  it('keeps a standard session active within 30 minutes', () => {
    expect(isSessionExpired({ rememberMe: false, lastActivityAt: ago(29), expiresAt: null }, now)).toBe(false);
  });
  it('keeps a remembered session before its expiry regardless of idle time', () => {
    expect(
      isSessionExpired({ rememberMe: true, lastActivityAt: ago(60 * 24 * 10), expiresAt: new Date(now.getTime() + 1000) }, now),
    ).toBe(false);
  });
  it('expires a remembered session past its expiry', () => {
    expect(
      isSessionExpired({ rememberMe: true, lastActivityAt: ago(5), expiresAt: new Date(now.getTime() - 1) }, now),
    ).toBe(true);
  });
});
