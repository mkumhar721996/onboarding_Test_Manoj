import { describe, it, expect } from 'vitest';
import { buildNotificationPayload } from '../../src/processor';

describe('buildNotificationPayload', () => {
  it('builds a payload for a valid email job', () => {
    const payload = buildNotificationPayload({
      to: 'jane@example.com',
      subject: 'Leave approved',
      body: 'Your leave request has been approved.',
    });

    expect(payload).toEqual({
      to: 'jane@example.com',
      subject: 'Leave approved',
      body: 'Your leave request has been approved.',
    });
  });

  it('rejects an invalid recipient address', () => {
    expect(() =>
      buildNotificationPayload({ to: 'not-an-email', subject: 'x', body: 'y' }),
    ).toThrow('Invalid recipient email address');
  });
});
