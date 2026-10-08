import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../src/auth/password';

describe('password hashing', () => {
  it('verifies the original password and not another', async () => {
    const hash = await hashPassword('Fresh2Start');
    expect(hash).not.toBe('Fresh2Start');
    expect(await verifyPassword('Fresh2Start', hash)).toBe(true);
    expect(await verifyPassword('Wrong2Start', hash)).toBe(false);
  });
});
