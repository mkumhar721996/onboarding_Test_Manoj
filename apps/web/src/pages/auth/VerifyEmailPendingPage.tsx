import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Banner from '../../components/auth/Banner';
import { authApi } from '../../lib/authApi';

export default function VerifyEmailPendingPage() {
  const email = (useLocation().state as { email?: string } | null)?.email;
  const [resent, setResent] = useState(false);

  async function resend() {
    if (email) await authApi.resendVerification(email);
    setResent(true);
  }

  return (
    <AuthShell>
      <div className="card auth-card">
        <h2 className="card-title">Confirm your email</h2>
        <p className="card-body">
          We've sent a confirmation link to <strong>{email ?? 'your email'}</strong>. Click the link
          to activate your account — it expires in 24 hours.
        </p>
        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 'var(--space-4)' }}
          onClick={resend}
        >
          Resend confirmation email
        </button>
        {resent ? (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Banner kind="success">A new confirmation link has been sent.</Banner>
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}
