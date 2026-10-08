summary: |
  This item asks for a self-contained registration/login system ("register and login on a
  facebook website") with email verification, lockout, remember-me sessions, and password
  reset — 40 acceptance criteria in total, with AC27 explicitly requiring it to be a standalone
  system with no real integration with or calls to facebook.com. The approved prototype
  (.arc/designs/ONBOARDING-TEST-MANOJ-STORY-011-design.html) already builds this as an
  invented, unrelated brand ("Connectly") for exactly that reason, and its own comments flag a
  design-system gap (no semantic danger/success tokens yet). This plan builds that approved
  design test-first: a new `src/auth/*` module inside comp_hr_api (Fastify + PostgreSQL) backed
  by four new tables (users, email-verification tokens, password-reset tokens, sessions),
  reusing comp_notification_worker's existing BullMQ `notifications` queue contract to send
  verification/reset emails, plus new React Router pages in comp_web_app that reproduce every
  screen/state in the prototype (Register, Verify Email, Email Confirmation, Log In, Forgot/Reset
  Password, Session Expired, Account Home). It flags, rather than silently resolves, a real
  conflict: ADR-0016 and about.md both say authentication should be delegated to the
  organization's corporate identity provider (bought, not built) — this story asks for the
  opposite, and the design's own framing as a standalone demo is the closest thing to an
  explanation on record.
scope:
  - description: |
      Add `ensureAuthSchema(pool)` to `services/hr-api/src/auth/schema.ts`, exporting idempotent
      `CREATE TABLE IF NOT EXISTS` DDL for `auth_users`, `auth_email_verification_tokens`,
      `auth_password_reset_tokens`, and `auth_sessions`. IDs are generated in application code
      via `crypto.randomUUID()` (not `gen_random_uuid()`), so no Postgres extension is required.
      Call `ensureAuthSchema(pool)` once in `server.ts` before `app.listen`, and export it from
      `app.ts` so e2e test setup can call it against the same `DATABASE_URL`.
    files:
      - services/hr-api/src/auth/schema.ts
      - services/hr-api/src/app.ts
      - services/hr-api/src/server.ts
    rationale: |
      AC27 requires a standalone system; the repo has no migration tool today (only `pg`), so an
      idempotent bootstrap keeps footprint minimal and matches existing conventions (`db.ts`
      already exports a bare `Pool`).
  - description: |
      Pure validation helpers in `services/hr-api/src/auth/validation.ts`:
      `isValidEmail(email: string): boolean`, `passwordComplexityErrors(password: string): string[]`,
      `isPasswordValid(password: string): boolean`, `calculateAge(dob: string, now?: Date): number`.
      Mirrors the prototype's `EMAIL_RE`/`passwordChecks`/`ageFromDob` exactly (design.html lines
      975-998) so UI and API agree on what "valid" means.
    files:
      - services/hr-api/src/auth/validation.ts
      - services/hr-api/test/unit/auth/validation.test.ts
    rationale: Needed by registration (AC3-10, AC30/31) and password reset (AC24).
  - description: |
      `services/hr-api/src/auth/password.ts`: `hashPassword(plain: string): Promise<string>` and
      `verifyPassword(plain: string, hash: string): Promise<boolean>`, implemented with `bcrypt`.
    files:
      - services/hr-api/src/auth/password.ts
      - services/hr-api/test/unit/auth/password.test.ts
    rationale: No password hashing exists anywhere in the repo yet; needed for AC1 and AC24.
  - description: |
      `services/hr-api/src/auth/tokens.ts`: `generateToken(): string` (32 random bytes, hex),
      `tokenExpiry(hoursFromNow: number, now?: Date): Date`, `isTokenExpired(expiresAt: Date, now?: Date): boolean`.
      Used for both the 24-hour email-verification token (AC15) and the 1-hour password-reset
      token (AC26).
    files:
      - services/hr-api/src/auth/tokens.ts
      - services/hr-api/test/unit/auth/tokens.test.ts
    rationale: Shared expiry logic for two token types avoids duplicating the same date-math twice.
  - description: |
      Pure decision function `services/hr-api/src/auth/loginPolicy.ts`:
      `decideLogin(state: LoginAttemptState, now: Date): LoginDecision`, where
      `LoginAttemptState = { passwordMatches: boolean; emailVerified: boolean; failedLoginAttempts: number; lockedUntil: Date | null }`
      and `LoginDecision` is one of
      `{ outcome: 'locked'; unlockAt: Date } | { outcome: 'locked_now'; unlockAt: Date } | { outcome: 'invalid_credentials' } | { outcome: 'unverified' } | { outcome: 'success' }`.
      Check order mirrors the prototype's login handler exactly (design.html lines 1186-1223):
      locked-until first, then password match (incrementing toward a 5th-attempt lock), then
      email-verified, then success.
    files:
      - services/hr-api/src/auth/loginPolicy.ts
      - services/hr-api/test/unit/auth/loginPolicy.test.ts
    rationale: |
      Isolating the branching logic (AC11/12, AC18/19, AC36-40) as a pure function makes every
      branch unit-testable without a database, and lets `routes.ts` stay a thin IO shell.
  - description: |
      Pure function `services/hr-api/src/auth/sessionPolicy.ts`:
      `isSessionExpired(session: { rememberMe: boolean; lastActivityAt: Date; expiresAt: Date | null }, now: Date): boolean`.
      Non-remembered sessions expire after 30 minutes of inactivity (`now - lastActivityAt > 30min`);
      remembered sessions expire only once `now > expiresAt` (set to +30 days at login).
    files:
      - services/hr-api/src/auth/sessionPolicy.ts
      - services/hr-api/test/unit/auth/sessionPolicy.test.ts
    rationale: Covers AC20-22 and AC29 with one small, directly testable rule.
  - description: |
      Automated guard for AC27: a unit test that reads every file under `services/hr-api/src/auth`
      and asserts none contain the literal substring `facebook.com`.
    files:
      - services/hr-api/test/unit/auth/standalone.test.ts
    rationale: |
      AC27 ("no real integration with or calls to facebook.com") is otherwise unenforceable by a
      normal assertion; a source-scan test turns it into a real regression check.
  - description: |
      `services/hr-api/src/auth/repository.ts`: thin query wrappers over the existing `pool` export
      from `db.ts` — `createUser`, `findUserByEmail`, `markEmailVerified`, `createEmailVerificationToken`,
      `findVerificationToken`, `createPasswordResetToken`, `findResetToken`, `markResetTokenUsed`,
      `updateUserPassword`, `recordFailedLogin`, `resetFailedLogins`, `lockAccount`, `createSession`,
      `findSession`, `touchSessionActivity`, `deleteSession`. No dedicated unit test (it's a thin DB
      layer); exercised through the e2e route tests below.
    files:
      - services/hr-api/src/auth/repository.ts
    rationale: Keeps SQL out of `routes.ts`, consistent with the existing `db.ts`/`pool` pattern.
  - description: |
      `services/hr-api/src/auth/notifications.ts`: `enqueueVerificationEmail(email: string, token: string): Promise<void>`
      and `enqueuePasswordResetEmail(email: string, token: string): Promise<void>`, each building a
      `{ to, subject, body }` payload and calling `new Queue('notifications', connection).add(...)`,
      reusing comp_notification_worker's existing `NotificationJobData` shape
      (`services/notification-worker/src/processor.ts`) and queue name
      (`services/notification-worker/src/connection.ts`, `NOTIFICATION_QUEUE_NAME = 'notifications'`).
      The connection config (`REDIS_HOST`/`REDIS_PORT`) is duplicated locally rather than imported
      cross-package, since the two services have no shared package today.
    files:
      - services/hr-api/src/auth/notifications.ts
    rationale: |
      ADR-0011 routes outbound email through comp_notification_worker; this reuses that contract
      instead of inventing a second email path. comp_notification_worker's own `processNotificationJob`
      is a stub today (it only validates and returns the payload, it does not actually send mail) —
      this plan does not add real email delivery, only correctly-shaped enqueueing.
  - description: |
      Wire `@fastify/cookie` (signed, secret from `COOKIE_SECRET` env var) and `@fastify/cors`
      (origin from `WEB_APP_ORIGIN` env var, `credentials: true`) into `services/hr-api/src/app.ts`,
      and mount the new auth routes plugin under the `/auth` prefix.
    files:
      - services/hr-api/src/app.ts
      - services/hr-api/.env.example
    rationale: |
      The web app and hr-api run on different origins in this environment (root `.env`:
      `ARC_DEV_PORT=8011`, `ARC_WEB_PORT=3011`), so a browser login flow needs explicit
      cookie + CORS support that the existing `/health`-only app never required.
  - description: |
      `POST /auth/register` in `services/hr-api/src/auth/routes.ts`. Validation order mirrors the
      prototype (design.html lines 1056-1104): missing fields (400, one `{ field, message }` per
      first missing field) → malformed email (400) → password complexity (400) → under-13 age
      (400) → duplicate email (400) → success (201, enqueues a verification email + 24h token).
    files:
      - services/hr-api/src/auth/routes.ts
      - services/hr-api/test/e2e/auth/register.e2e.test.ts
    rationale: Covers AC1-10, AC30/31.
  - description: |
      `POST /auth/verify-email` and `POST /auth/verify-email/resend` in the same routes file.
      A valid token marks the user verified (200). An expired token returns 410 with the owning
      email (`{ email }`) so the client can offer a one-click resend to that address (AC15),
      matching design.html lines 649-661.
    files:
      - services/hr-api/src/auth/routes.ts
      - services/hr-api/test/e2e/auth/verify-email.e2e.test.ts
    rationale: Covers AC13-15.
  - description: |
      `POST /auth/login` in the same routes file, orchestrating `loginPolicy.decideLogin` with
      `repository`: 401 + `'Incorrect email or password'` for invalid credentials (AC18/19), 401 +
      a verification-required message for an unverified account (AC11/12), 423 + unlock time for a
      lock triggered on this attempt or still active (AC36-39), 200 + `Set-Cookie` session on
      success (AC16/40), clearing `failed_login_attempts`/`locked_until` on success.
    files:
      - services/hr-api/src/auth/routes.ts
      - services/hr-api/test/e2e/auth/login.e2e.test.ts
    rationale: Covers AC11/12, AC16, AC18/19, AC36-40.
  - description: |
      `GET /auth/session` and `POST /auth/logout`, plus a `requireSession` preHandler in
      `services/hr-api/src/auth/guard.ts` that reads the session cookie, loads the session row,
      and applies `sessionPolicy.isSessionExpired` — touching `last_activity_at` on every
      authenticated request for non-remembered sessions. Logout always deletes the session row and
      clears the cookie; the response distinguishes "remembered session + persistent token both
      invalidated" (AC32/33) from "standard session invalidated immediately" (AC34/35).
    files:
      - services/hr-api/src/auth/routes.ts
      - services/hr-api/src/auth/guard.ts
      - services/hr-api/test/e2e/auth/session.e2e.test.ts
      - services/hr-api/test/e2e/auth/logout.e2e.test.ts
    rationale: Covers AC17 (session gate), AC20-22, AC29, AC32-35.
  - description: |
      `POST /auth/forgot-password` (always 200 with the generic message, regardless of whether the
      email is registered — AC23/28) and `POST /auth/reset-password` (validates the 1-hour token,
      re-checks password complexity, updates `password_hash`, marks the token used; 410 + an
      "expired" message past 1 hour — AC26).
    files:
      - services/hr-api/src/auth/routes.ts
      - services/hr-api/test/e2e/auth/password-reset.e2e.test.ts
    rationale: Covers AC23-26, AC28.
  - description: |
      Add new dependencies to the manifest and document new env vars.
    files:
      - services/hr-api/package.json
      - services/hr-api/.env.example
    rationale: |
      `bcrypt`/`@types/bcrypt` (hashing), `bullmq` (this service becomes a second BullMQ producer
      alongside comp_notification_worker's consumer), `@fastify/cookie` and `@fastify/cors`
      (session cookie + cross-origin browser flow). New env vars: `COOKIE_SECRET`, `WEB_APP_ORIGIN`,
      `REDIS_HOST`, `REDIS_PORT`.
  - description: |
      Add `react-router-dom`, wrap `<App />` in a `<BrowserRouter>` in `main.tsx`, and move route
      definitions into `apps/web/src/router.tsx`: `/register`, `/login`, `/verify-email`,
      `/confirm-email`, `/forgot-password`, `/reset-password`, `/session-expired`, and `/` (gated,
      renders `AccountHomePage` or redirects to `/login`). Add `VITE_ARC_API_URL` to
      `apps/web/.env.local` mirroring the root `.env`'s `ARC_API_URL=http://localhost:8011` (Vite
      only exposes `VITE_`-prefixed vars to client code, and no such var exists yet).
    files:
      - apps/web/package.json
      - apps/web/src/main.tsx
      - apps/web/src/router.tsx
      - apps/web/.env.local
    rationale: |
      comp_web_app has no routing today (`App.tsx` renders one static shell); the design's screens
      (design.html `data-name` attributes) map directly to these routes.
  - description: |
      `apps/web/src/context/SessionContext.tsx` (fetches `GET /auth/session` on mount/focus,
      exposes `{ user, login, logout }`, and redirects to `/login` or
      `/session-expired?reason=inactivity|remember` on a 401) and `apps/web/src/lib/authApi.ts`
      (thin `fetch` wrappers for every `/auth/*` endpoint, `credentials: 'include'`).
    files:
      - apps/web/src/context/SessionContext.tsx
      - apps/web/src/lib/authApi.ts
    rationale: |
      Centralizes the one piece of cross-cutting logic (AC20-22, AC29) instead of duplicating
      session-expiry handling in every page.
  - description: |
      Add the three proposed status tokens from the design's own gap annotation (design.html lines
      17-23, 193-200) to the shared token sheet: `--color-danger`, `--color-danger-bg`,
      `--color-danger-border` (`#b91c1c` / `#fef2f2` / `#fecaca`) and `--color-success`,
      `--color-success-bg`, `--color-success-border` (`#15803d` / `#f0fdf4` / `#bbf7d0`).
    files:
      - design-system/tokens.css
    rationale: |
      The design file itself flags that `tokens.json`/`tokens.css` have no semantic error/success
      colors yet and proposes exactly these six values "pending design-system-bootstrap to
      formalize" — needed by every error banner/field-error/success banner in this story
      (AC4, AC6, AC8, AC10, AC12, AC19, AC25, AC31, AC37, AC39, etc).
  - description: |
      Shared auth UI primitives translating the prototype's CSS classes into Tailwind/React:
      `AuthShell` (`.auth-shell`/`.auth-brand`/`.auth-card`, design.html lines 216-285),
      `Banner` (`.banner-success`/`.banner-error`, lines 323-344), `FieldError` (`.field-error`,
      lines 287-304), `PasswordChecklist` (`.checklist`, lines 305-314, live-updating on each
      keystroke exactly like the prototype's `updateChecklist`).
    files:
      - apps/web/src/components/auth/AuthShell.tsx
      - apps/web/src/components/auth/Banner.tsx
      - apps/web/src/components/auth/FieldError.tsx
      - apps/web/src/components/auth/PasswordChecklist.tsx
    rationale: Four screens repeat the same card/banner/field-error shapes; avoids duplicating markup.
  - description: |
      `apps/web/src/pages/auth/RegisterPage.tsx`: the form + success panel from design.html lines
      523-591, calling `authApi.register`. Field-level errors replace one another inline as
      described in the design's own notes (lines 512-522); the submit button disables and relabels
      to "Creating account…" while the request is in flight.
    files:
      - apps/web/src/pages/auth/RegisterPage.tsx
      - apps/web/test/unit/auth/RegisterPage.test.tsx
    rationale: Covers AC1-10, AC27, AC30/31 at the UI layer.
  - description: |
      `apps/web/src/pages/auth/VerifyEmailPendingPage.tsx` and
      `apps/web/src/pages/auth/EmailConfirmationPage.tsx` (reads `?token=` from the URL, calls
      `authApi.verifyEmail`), matching design.html lines 602-662 (pending / verified / expired
      states, resend button).
    files:
      - apps/web/src/pages/auth/VerifyEmailPendingPage.tsx
      - apps/web/src/pages/auth/EmailConfirmationPage.tsx
      - apps/web/test/unit/auth/VerifyEmail.test.tsx
    rationale: Covers AC13-15 at the UI layer.
  - description: |
      `apps/web/src/pages/auth/LoginPage.tsx`: single banner area above the form covering invalid
      credentials, unverified email, and both lockout states, plus the "remember me" checkbox and
      "forgot password" link, per design.html lines 675-718 and the `renderLoginBanner` message
      copy (lines 1132-1154).
    files:
      - apps/web/src/pages/auth/LoginPage.tsx
      - apps/web/test/unit/auth/LoginPage.test.tsx
    rationale: Covers AC11/12, AC16-19, AC36-40 at the UI layer.
  - description: |
      `apps/web/src/pages/auth/ForgotPasswordPage.tsx` and
      `apps/web/src/pages/auth/ResetPasswordPage.tsx`, per design.html lines 727-817 (generic
      "check your inbox" confirmation; new-password form with the same live checklist; expired-link
      state with a one-click re-request).
    files:
      - apps/web/src/pages/auth/ForgotPasswordPage.tsx
      - apps/web/src/pages/auth/ResetPasswordPage.tsx
      - apps/web/test/unit/auth/PasswordReset.test.tsx
    rationale: Covers AC23-26, AC28 at the UI layer.
  - description: |
      `apps/web/src/pages/auth/SessionExpiredPage.tsx` (reads `?reason=inactivity|remember`, per
      design.html lines 826-848) wired to `SessionContext`'s redirect-on-401 behavior.
    files:
      - apps/web/src/pages/auth/SessionExpiredPage.tsx
      - apps/web/test/unit/auth/SessionExpiredPage.test.tsx
    rationale: Covers AC20-22, AC29 at the UI layer.
  - description: |
      Evolve `apps/web/src/App.tsx` into `AccountHomePage` content (keeping the existing sidebar
      markup/aria-label this component already has — it already matches the design's
      Dashboard/Records/Settings sidebar almost exactly) per design.html lines 863-934: "Welcome
      back, {name}", account/session cards, and a logout button whose confirmation copy branches
      on whether "remember me" was active (AC32/33 vs AC34/35).
    files:
      - apps/web/src/App.tsx
      - apps/web/src/pages/AccountHomePage.tsx
      - apps/web/test/unit/auth/AccountHomePage.test.tsx
    rationale: Covers AC16/17 (destination after login) and AC32-35 (logout) at the UI layer.
  - description: |
      Replace the two scaffold tests that currently assert the placeholder "HR Management System"
      heading unconditionally, since root `/` now renders differently depending on auth state:
      unauthenticated → redirected to `/login` (card title "Log in"); authenticated → "Welcome
      back, {name}" with the same Dashboard/Records/Settings nav.
    files:
      - apps/web/test/unit/App.test.tsx
      - apps/web/test/e2e/app.e2e.spec.ts
    rationale: |
      These are placeholder tests from the scaffolding commits (CHORE-003/008/009/010), not a
      previously-shipped feature; this story supersedes the placeholder content they assert.
  - description: |
      `apps/web/test/e2e/auth.e2e.spec.ts`: a Playwright golden path (register → verify →
      log in → account home → logout) using `page.route()` to mock every `/auth/*` response,
      rather than requiring a live Postgres/Redis-backed hr-api inside the web app's own e2e run.
    files:
      - apps/web/test/e2e/auth.e2e.spec.ts
    rationale: |
      Matches the existing e2e test's backend-independent pattern (`app.e2e.spec.ts` today checks
      static shell content only); full real-backend behavior is covered by hr-api's own Supertest
      e2e suite against a real Postgres.
tests:
  - |
    AC1 — register.e2e.test.ts: a valid submission creates a row.
    const res = await request(app.server).post('/auth/register').send(validBody);
    expect(res.status).toBe(201);
    const row = await pool.query('select 1 from auth_users where email = $1', [validBody.email]);
    expect(row.rowCount).toBe(1);
  - |
    AC2 — same request's body signals success for the UI, and RegisterPage renders the success panel.
    expect(res.body).toEqual({ name: validBody.name, email: validBody.email });
    expect(await screen.findByText('Account created')).toBeInTheDocument();
  - |
    AC3 — register.e2e.test.ts: omitting password rejects with no row created.
    const res = await request(app.server).post('/auth/register').send({ ...validBody, password: '' });
    expect(res.status).toBe(400);
  - |
    AC4 — error message shown, both API and inline field error.
    expect(res.body).toMatchObject({ field: 'password', message: 'Enter a password.' });
    expect(screen.getByText('Enter a password.')).toBeInTheDocument();
  - |
    AC5 — validation.test.ts + register.e2e.test.ts: a weak password is rejected.
    expect(isPasswordValid('weakpass')).toBe(false);
    const res = await request(app.server).post('/auth/register').send({ ...validBody, password: 'weakpass' });
    expect(res.status).toBe(400);
  - |
    AC6 — complexity message matches the design's exact copy (design.html line 1084).
    expect(res.body.message).toBe('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.');
  - |
    AC7 — register.e2e.test.ts: registering the same email twice rejects the second call.
    await request(app.server).post('/auth/register').send(validBody);
    const res = await request(app.server).post('/auth/register').send(validBody);
    expect(res.status).toBe(400);
  - |
    AC8 — duplicate-email message matches the story's required exact wording.
    expect(res.body.message).toBe('An account with this email already exists. Please log in or reset your password.');
  - |
    AC9 — validation.test.ts calculateAge + register.e2e.test.ts: a 6-year-old dob is rejected.
    expect(calculateAge('2020-01-01', new Date('2026-10-08'))).toBe(6);
    const res = await request(app.server).post('/auth/register').send({ ...validBody, dob: '2020-01-01' });
    expect(res.status).toBe(400);
  - |
    AC10 — age-requirement message matches design.html line 1088.
    expect(res.body.message).toBe('You must be at least 13 years old to create an account.');
  - |
    AC11 — login.e2e.test.ts: logging in before verifying is rejected.
    await request(app.server).post('/auth/register').send(validBody);
    const res = await request(app.server).post('/auth/login').send({ email: validBody.email, password: validBody.password });
    expect(res.status).toBe(401);
  - |
    AC12 — verification-required message matches design.html line 1137.
    expect(res.body.message).toBe('We sent a confirmation link to your inbox. Confirm your email, then log in.');
  - |
    AC13 — verify-email.e2e.test.ts: a valid token verifies the account and returns a confirmation message.
    const res = await request(app.server).post('/auth/verify-email').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
  - |
    AC14 — login is permitted immediately after verification.
    await request(app.server).post('/auth/verify-email').send({ token });
    const loginRes = await request(app.server).post('/auth/login').send({ email, password });
    expect(loginRes.status).toBe(200);
  - |
    AC15 — an expired token returns the owning email so the UI can offer a resend, and resend issues a fresh token.
    const res = await request(app.server).post('/auth/verify-email').send({ token: expiredToken });
    expect(res.status).toBe(410);
    expect(res.body.email).toBe(email);
    const resendRes = await request(app.server).post('/auth/verify-email/resend').send({ email });
    expect(resendRes.status).toBe(200);
  - |
    AC16 — login.e2e.test.ts: correct credentials on a verified account log in and set a session cookie.
    const res = await request(app.server).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  - |
    AC17 — LoginPage.test.tsx: a successful login navigates to the account home route.
    expect(mockNavigate).toHaveBeenCalledWith('/');
  - |
    AC18 — login.e2e.test.ts: incorrect credentials are rejected.
    const res = await request(app.server).post('/auth/login').send({ email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
  - |
    AC19 — invalid-credentials message matches design.html line 1136.
    expect(res.body.message).toBe('Incorrect email or password');
  - |
    AC20 — sessionPolicy.test.ts: 31 idle minutes without "remember me" counts as expired.
    expect(isSessionExpired({ rememberMe: false, lastActivityAt: new Date(now.getTime() - 31 * 60000), expiresAt: null }, now)).toBe(true);
  - |
    AC21 — session.e2e.test.ts: GET /auth/session with a stale (31-minute-idle) cookie returns 401.
    const res = await request(app.server).get('/auth/session').set('Cookie', staleCookie);
    expect(res.status).toBe(401);
  - |
    AC22 — sessionPolicy.test.ts: a remembered session short of its 30-day expiry stays valid.
    expect(isSessionExpired({ rememberMe: true, lastActivityAt: oldDate, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe(false);
  - |
    AC23 — password-reset.e2e.test.ts: a reset request for a registered email creates a reset token.
    const res = await request(app.server).post('/auth/forgot-password').send({ email });
    expect(res.status).toBe(200);
    const tokenRow = await pool.query('select 1 from auth_password_reset_tokens where user_id = $1', [userId]);
    expect(tokenRow.rowCount).toBe(1);
  - |
    AC24 — a valid token + complexity-passing password updates the stored hash.
    const res = await request(app.server).post('/auth/reset-password').send({ token, password: 'NewPass1x' });
    expect(res.status).toBe(200);
  - |
    AC25 — the user can then log in with the new password.
    const loginRes = await request(app.server).post('/auth/login').send({ email, password: 'NewPass1x' });
    expect(loginRes.status).toBe(200);
  - |
    AC26 — a reset token older than 1 hour is rejected with an expiry message.
    const res = await request(app.server).post('/auth/reset-password').send({ token: expiredToken, password: 'NewPass1x' });
    expect(res.status).toBe(410);
    expect(res.body.message).toMatch(/expired/i);
  - |
    AC27 — standalone.test.ts statically scans every file under services/hr-api/src/auth for the
    literal string "facebook.com"; RegisterPage also renders the design's own disclaimer copy.
    files.forEach(f => expect(readFileSync(f, 'utf8')).not.toMatch(/facebook\.com/i));
    expect(screen.getByText(/not affiliated with or connected to facebook\.com/i)).toBeInTheDocument();
  - |
    AC28 — password-reset.e2e.test.ts: an unregistered email gets the identical generic response.
    const res = await request(app.server).post('/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('If an account exists with this email, a password reset link has been sent.');
  - |
    AC29 — session.e2e.test.ts: a remember-me session whose 30-day expires_at has passed returns
    401 from GET /auth/session; SessionContext then redirects to /session-expired?reason=remember.
    const res = await request(app.server).get('/auth/session').set('Cookie', expiredRememberCookie);
    expect(res.status).toBe(401);
  - |
    AC30 — validation.test.ts + register.e2e.test.ts: a malformed email is rejected.
    expect(isValidEmail('alex.rivera[at]example.com')).toBe(false);
    const res = await request(app.server).post('/auth/register').send({ ...validBody, email: 'alex.rivera[at]example.com' });
    expect(res.status).toBe(400);
  - |
    AC31 — inline email-format error matches design.html line 1081.
    expect(res.body).toMatchObject({ field: 'email', message: 'Enter a valid email address, like name@example.com.' });
  - |
    AC32 — logout.e2e.test.ts: logging out of a remembered session deletes the session row.
    const res = await request(app.server).post('/auth/logout').set('Cookie', rememberCookie);
    expect(res.status).toBe(200);
    const row = await pool.query('select 1 from auth_sessions where id = $1', [sessionId]);
    expect(row.rowCount).toBe(0);
  - |
    AC33 — the same (now-deleted) cookie no longer authenticates, requiring full re-login.
    const sessionRes = await request(app.server).get('/auth/session').set('Cookie', rememberCookie);
    expect(sessionRes.status).toBe(401);
  - |
    AC34 — logout.e2e.test.ts: logging out of a standard (non-remembered) session invalidates it immediately.
    const res = await request(app.server).post('/auth/logout').set('Cookie', standardCookie);
    expect(res.status).toBe(200);
    const row = await pool.query('select 1 from auth_sessions where id = $1', [standardSessionId]);
    expect(row.rowCount).toBe(0);
  - |
    AC35 — AccountHomePage.test.tsx: clicking "Log out" navigates to /login.
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  - |
    AC36 — loginPolicy.test.ts: a 5th consecutive failure locks the account for 15 minutes.
    expect(decideLogin({ passwordMatches: false, emailVerified: true, failedLoginAttempts: 4, lockedUntil: null }, now))
      .toEqual({ outcome: 'locked_now', unlockAt: new Date(now.getTime() + 15 * 60000) });
  - |
    AC37 — login.e2e.test.ts: the 5th-failure response states the account is locked and when it unlocks.
    expect(res.status).toBe(423);
    expect(res.body.message).toMatch(/temporarily locked/i);
    expect(res.body.unlockAt).toBeDefined();
  - |
    AC38 — loginPolicy.test.ts: an attempt during an active lock is rejected regardless of credentials.
    expect(decideLogin({ passwordMatches: true, emailVerified: true, failedLoginAttempts: 5, lockedUntil: new Date(now.getTime() + 5 * 60000) }, now).outcome)
      .toBe('locked');
  - |
    AC39 — login.e2e.test.ts: the still-locked response states the account is locked and when it unlocks.
    expect(res.status).toBe(423);
    expect(res.body.message).toMatch(/still locked/i);
  - |
    AC40 — login.e2e.test.ts: once locked_until has passed, correct credentials log in and clear the lock.
    const res = await request(app.server).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    const row = await pool.query('select locked_until, failed_login_attempts from auth_users where email = $1', [email]);
    expect(row.rows[0].locked_until).toBeNull();
    expect(row.rows[0].failed_login_attempts).toBe(0);
assumptions_or_open_questions:
  - |
    Direct architecture conflict: ADR-0016 ("Authentication delegated to the organization's
    corporate identity provider (SSO) rather than building credential management in-house") and
    about.md's buy-vs-build list (authentication is "Reused", not "Built") both say the opposite of
    what this story's 40 ACs require. The approved design itself frames this as a standalone,
    unrelated-brand demo ("Connectly") rather than the product's real auth, which is the closest
    thing to a resolution on record. This plan builds exactly what the ACs/design specify, but
    flags this conflict for explicit confirmation before it's treated as the product's real login
    system rather than a scoped, standalone exercise.
  - |
    Session design is intentionally simpler than a typical dual-token setup: one `auth_sessions`
    row/cookie serves as both the standard session and the "remember me" persistent token,
    distinguished only by a `remember_me` flag and an `expires_at` value. This satisfies every
    session-related AC's literal wording (AC20-22, AC29, AC32-35) without a separate short-lived
    session token + long-lived refresh token pair.
  - |
    Idle-timeout (AC20/21) is enforced server-side (checked on every authenticated request via
    `last_activity_at`), not via a client-side 30-minute timer, since a purely client-side timer
    would miss idle time while the tab/browser is closed. The frontend discovers expiry by calling
    `GET /auth/session` on mount/navigation/focus.
  - |
    Password reset does not clear an existing account lockout, since no AC specifies this; a locked
    account that resets its password stays locked until the 15-minute window elapses.
  - |
    The verify-email resend endpoint (AC15) replies with a direct "sent to {email}" confirmation
    rather than the enumeration-safe generic phrasing used for password reset (AC28), since it's
    only reached from a context where the email is already known (an already-opened, expired link).
  - |
    apps/web's Playwright e2e test mocks hr-api responses via `page.route()` rather than running a
    live Postgres/Redis-backed hr-api, matching the existing e2e test's backend-independent style.
    Full real-backend behavior (DB writes, lockout, token expiry) is covered by hr-api's own
    Supertest e2e suite against a real Postgres.
  - |
    `apps/web/src/App.tsx` and its two scaffold tests (`App.test.tsx`, `app.e2e.spec.ts`) are
    treated as placeholder scaffolding from the CHORE commits, not a previously-shipped feature —
    this plan replaces their assertions rather than preserving the unconditional "HR Management
    System" heading.
package_dependencies:
  - name: bcrypt
    version: ^5.1.1
    ecosystem: npm
    component_id: comp_hr_api
    rationale: Password hashing for registration (AC1) and password reset (AC24); no hashing library exists in the repo today.
  - name: "@types/bcrypt"
    version: ^5.0.2
    ecosystem: npm
    component_id: comp_hr_api
    rationale: Type definitions for bcrypt, matching the repo's existing pattern of a matching @types/* devDependency for each untyped package (e.g. @types/pg).
  - name: bullmq
    version: ^5.28.1
    ecosystem: npm
    component_id: comp_hr_api
    rationale: comp_hr_api becomes a second BullMQ producer onto the existing 'notifications' queue (comp_notification_worker already depends on this same version as the consumer).
  - name: "@fastify/cookie"
    version: ^9.4.0
    ecosystem: npm
    component_id: comp_hr_api
    rationale: Signed session cookie issuance/parsing for login/session/logout (AC16, AC20-22, AC29, AC32-35); compatible with the existing Fastify v5 dependency.
  - name: "@fastify/cors"
    version: ^10.0.1
    ecosystem: npm
    component_id: comp_hr_api
    rationale: The web app and hr-api run on different origins in this environment, so cross-origin cookie-bearing requests need explicit CORS support; compatible with Fastify v5.
  - name: react-router-dom
    version: ^6.26.2
    ecosystem: npm
    component_id: comp_web_app
    rationale: comp_web_app has no client-side routing today; this story needs 8 distinct routes/screens.
notes: |
  This story's scope is almost entirely new (comp_hr_api today only has `GET /health`; comp_web_app
  today only renders one static shell). The diagram below shows every module this plan touches and
  how it connects to the two pieces of existing code it builds on (`db.ts`'s `pool`, and
  comp_notification_worker's existing queue/consumer contract).

  ```mermaid
  flowchart TD
    subgraph HR_API [comp_hr_api]
      AppTs[app.ts]
      Server[server.ts]
      Schema[auth/schema.ts]
      Routes[auth/routes.ts]
      Guard[auth/guard.ts]
      Repo[auth/repository.ts]
      Validation[auth/validation.ts]
      Password[auth/password.ts]
      Tokens[auth/tokens.ts]
      LoginPolicy[auth/loginPolicy.ts]
      SessionPolicy[auth/sessionPolicy.ts]
      Notifications[auth/notifications.ts]
      Db[db.ts pool]
    end
    subgraph Worker [comp_notification_worker]
      Connection[connection.ts]
      Processor[processor.ts]
    end
    subgraph Web [comp_web_app]
      MainTsx[main.tsx]
      Router[router.tsx]
      SessionCtx[context/SessionContext.tsx]
      AuthApi[lib/authApi.ts]
      Pages[pages/auth/*.tsx]
      AccountHome[pages/AccountHomePage.tsx]
    end

    Server -->|bootstraps schema| Schema
    AppTs -->|mounts /auth prefix| Routes
    Routes --> Guard
    Routes --> Repo
    Routes --> Validation
    Routes --> Password
    Routes --> Tokens
    Routes --> LoginPolicy
    Routes --> Notifications
    Guard --> SessionPolicy
    Repo --> Db
    Notifications -->|enqueue onto 'notifications' queue| Connection
    Connection --> Processor
    MainTsx --> Router
    Router --> SessionCtx
    Router --> Pages
    Router --> AccountHome
    Pages --> AuthApi
    SessionCtx --> AuthApi
    AuthApi -->|HTTP /auth/*, credentials include| Routes

    classDef touched fill:#f96,color:#000;
    class AppTs,Server,Schema,Routes,Guard,Repo,Validation,Password,Tokens,LoginPolicy,SessionPolicy,Notifications,MainTsx,Router,SessionCtx,AuthApi,Pages,AccountHome touched;
  ```
review_focus: |
  In scope: a standalone credential store (registration, email verification, login with lockout,
  remember-me sessions, password reset, logout) inside comp_hr_api, plus matching comp_web_app
  pages — all per the approved "Connectly" prototype. Out of scope: real email delivery (only
  correctly-shaped enqueueing onto the existing notifications queue), any change to
  comp_notification_worker's consumer, and anything resembling the organization's actual
  SSO-based authentication. The riskiest area is the login/lockout state machine
  (`loginPolicy.decideLogin` + the `auth_users.failed_login_attempts`/`locked_until` columns) —
  get the check order wrong (lock check vs. credential check vs. verified check) and several ACs
  silently pass for the wrong reason. Also worth double-checking: this plan deliberately uses one
  session row/cookie for both standard and "remember me" sessions rather than two separate tokens
  (see assumptions) — don't flag that as a missing second token, it's a documented simplification.
  Flag, rather than quietly accept, that this entire feature contradicts ADR-0016's "auth via
  corporate SSO, not built in-house" decision — that conflict is called out in
  assumptions_or_open_questions but is a product/architecture call, not an engineering one.
