import { randomBytes } from 'node:crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function tokenExpiry(hoursFromNow: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
}

export function isTokenExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > expiresAt.getTime();
}
