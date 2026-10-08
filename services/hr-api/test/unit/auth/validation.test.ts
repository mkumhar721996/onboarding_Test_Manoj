import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isPasswordValid,
  passwordComplexityErrors,
  calculateAge,
} from '../../../src/auth/validation';

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('alex@example.com')).toBe(true);
  });
  it('rejects a malformed address', () => {
    expect(isValidEmail('alex.rivera[at]example.com')).toBe(false);
    expect(isValidEmail('alex@nodomain')).toBe(false);
  });
});

describe('password complexity', () => {
  it('accepts a compliant password', () => {
    expect(isPasswordValid('Fresh2Start')).toBe(true);
    expect(passwordComplexityErrors('Fresh2Start')).toEqual([]);
  });
  it('rejects each missing requirement', () => {
    expect(isPasswordValid('weakpass')).toBe(false);
    expect(isPasswordValid('Sh0rt')).toBe(false);
    expect(isPasswordValid('alllower1')).toBe(false);
    expect(isPasswordValid('ALLUPPER1')).toBe(false);
    expect(isPasswordValid('NoNumbers')).toBe(false);
    expect(passwordComplexityErrors('weakpass')).toEqual(['uppercase', 'number']);
  });
});

describe('calculateAge', () => {
  it('computes whole years', () => {
    expect(calculateAge('2020-01-01', new Date('2026-10-08'))).toBe(6);
  });
  it('does not count a birthday that has not happened yet', () => {
    expect(calculateAge('2013-10-09', new Date('2026-10-08'))).toBe(12);
    expect(calculateAge('2013-10-08', new Date('2026-10-08'))).toBe(13);
  });
});
