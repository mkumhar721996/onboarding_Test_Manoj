import type { FastifyReply, FastifyRequest } from 'fastify';
import { deleteSession, findSession, touchSessionActivity, type SessionRecord } from './repository';
import { isSessionExpired } from './sessionPolicy';

export const SESSION_COOKIE = 'hr_session';

declare module 'fastify' {
  interface FastifyRequest {
    authSession?: SessionRecord;
  }
}

export function readSessionId(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid ? unsigned.value : null;
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const id = readSessionId(request);
  const session = id ? await findSession(id) : null;
  if (!session) {
    return reply.code(401).send({ reason: 'none', message: 'Log in to continue.' });
  }
  if (isSessionExpired(session, new Date())) {
    await deleteSession(session.id);
    reply.clearCookie(SESSION_COOKIE, { path: '/', secure: process.env.NODE_ENV === 'production' });
    return reply
      .code(401)
      .send({ reason: session.rememberMe ? 'remember' : 'inactivity', message: 'Session expired.' });
  }
  if (!session.rememberMe) await touchSessionActivity(session.id);
  request.authSession = session;
}
