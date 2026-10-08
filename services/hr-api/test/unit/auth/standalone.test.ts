import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const authDir = join(__dirname, '../../../src/auth');

describe('standalone auth system', () => {
  it('never references facebook.com in source', () => {
    const files = readdirSync(authDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(readFileSync(join(authDir, f), 'utf8')).not.toMatch(/facebook\.com/i);
    }
  });
});
