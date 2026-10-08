import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildApp } from '../../../src/app';

describe('COOKIE_SECRET', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is required in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECRET', '');
    expect(() => buildApp()).toThrow(/COOKIE_SECRET/);
  });
});
