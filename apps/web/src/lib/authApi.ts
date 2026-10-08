const API_URL = import.meta.env.VITE_ARC_API_URL ?? 'http://localhost:8011';

export interface ApiResult<T = Record<string, any>> {
  ok: boolean;
  status: number;
  data: T;
}

async function call(path: string, method: 'GET' | 'POST', body?: unknown): Promise<ApiResult> {
  const res = await fetch(`${API_URL}/auth${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const authApi = {
  register: (input: { name: string; email: string; password: string; dob: string }) =>
    call('/register', 'POST', input),
  verifyEmail: (token: string) => call('/verify-email', 'POST', { token }),
  resendVerification: (email: string) => call('/verify-email/resend', 'POST', { email }),
  login: (input: { email: string; password: string; rememberMe: boolean }) =>
    call('/login', 'POST', input),
  session: () => call('/session', 'GET'),
  logout: () => call('/logout', 'POST', {}),
  forgotPassword: (email: string) => call('/forgot-password', 'POST', { email }),
  resetPassword: (token: string, password: string) =>
    call('/reset-password', 'POST', { token, password }),
};
