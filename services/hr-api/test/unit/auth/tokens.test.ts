import { describe, it, expect } from 'vitest';
import { generateToken, tokenExpiry, isTokenExpired } from '../../../src/auth/tokens';

const now = new Date('2026-10-08T12:00:00Z');

describe('tokens', () => {
  it('generates 64-char hex tokens that differ', () => {
    const a = generateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken()).not.toBe(a);
  });
  it('computes expiry hours from now', () => {
    expect(tokenExpiry(24, now)).toEqual(new Date('2026-10-09T12:00:00Z'));
  });
  it('detects expiry', () => {
    expect(isTokenExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isTokenExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });
});
