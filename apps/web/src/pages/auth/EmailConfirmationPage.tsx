import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Banner from '../../components/auth/Banner';
import { authApi } from '../../lib/authApi';

type State =
  | { kind: 'loading' }
  | { kind: 'verified' }
  | { kind: 'expired'; email: string }
  | { kind: 'invalid'; message: string };

export default function EmailConfirmationPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [resent, setResent] = useState(false);

  useEffect(() => {
    authApi.verifyEmail(token).then((res) => {
      if (res.ok) setState({ kind: 'verified' });
      else if (res.status === 410) setState({ kind: 'expired', email: res.data.email });
      else setState({ kind: 'invalid', message: res.data.message ?? 'This link is not valid.' });
    });
  }, [token]);

  async function resend(email: string) {
    await authApi.resendVerification(email);
    setResent(true);
  }

  return (
    <AuthShell>
      <div className="card auth-card">
        {state.kind === 'loading' ? <p className="card-body">Confirming your email…</p> : null}
        {state.kind === 'verified' ? (
          <>
            <Banner kind="success" title="Email verified">
              Your account is confirmed and ready to use.
            </Banner>
            <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-4)' }}>
              Log in
            </Link>
          </>
        ) : null}
        {state.kind === 'expired' ? (
          <>
            <Banner kind="error" title="This link has expired">
              Confirmation links are only valid for 24 hours.
            </Banner>
            <p className="card-body">
              Request a new link and we'll send it to <strong>{state.email}</strong>.
            </p>
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={() => resend(state.email)}
            >
              Resend confirmation email
            </button>
            {resent ? (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Banner kind="success">A new confirmation link has been sent. Check your inbox.</Banner>
              </div>
            ) : null}
          </>
        ) : null}
        {state.kind === 'invalid' ? <Banner kind="error" title="Link not valid">{state.message}</Banner> : null}
      </div>
    </AuthShell>
  );
}
