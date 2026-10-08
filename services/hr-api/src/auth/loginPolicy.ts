export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export interface LoginAttemptState {
  passwordMatches: boolean;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export type LoginDecision =
  | { outcome: 'locked'; unlockAt: Date }
  | { outcome: 'locked_now'; unlockAt: Date }
  | { outcome: 'invalid_credentials' }
  | { outcome: 'unverified' }
  | { outcome: 'success' };

// Check order matters: active lock, then credentials (counting toward a lock), then verification.
export function decideLogin(state: LoginAttemptState, now: Date): LoginDecision {
  let failed = state.failedLoginAttempts;
  if (state.lockedUntil) {
    if (now.getTime() < state.lockedUntil.getTime()) {
      return { outcome: 'locked', unlockAt: state.lockedUntil };
    }
    failed = 0;
  }

  if (!state.passwordMatches) {
    if (failed + 1 >= MAX_FAILED_ATTEMPTS) {
      return {
        outcome: 'locked_now',
        unlockAt: new Date(now.getTime() + LOCKOUT_MINUTES * 60000),
      };
    }
    return { outcome: 'invalid_credentials' };
  }

  if (!state.emailVerified) return { outcome: 'unverified' };
  return { outcome: 'success' };
}
