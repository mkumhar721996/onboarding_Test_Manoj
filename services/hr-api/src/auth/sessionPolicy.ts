export const IDLE_TIMEOUT_MINUTES = 30;
export const REMEMBER_ME_DAYS = 30;

export interface SessionState {
  rememberMe: boolean;
  lastActivityAt: Date;
  expiresAt: Date | null;
}

export function isSessionExpired(session: SessionState, now: Date): boolean {
  if (session.rememberMe) {
    return session.expiresAt !== null && now.getTime() > session.expiresAt.getTime();
  }
  return now.getTime() - session.lastActivityAt.getTime() > IDLE_TIMEOUT_MINUTES * 60000;
}
