import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Banner from '../../components/auth/Banner';
import { authApi } from '../../lib/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    await authApi.forgotPassword(trimmed);
    setSentTo(trimmed || 'that address');
  }

  return (
    <AuthShell>
      {sentTo ? (
        <div className="card auth-card">
          <Banner kind="success" title="Check your inbox">
            If an account exists for {sentTo}, a password reset link has been sent.
          </Banner>
          <button
            className="btn btn-secondary btn-block"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={() => setSentTo(null)}
          >
            Try a different email
          </button>
        </div>
      ) : (
        <div className="card auth-card">
          <h2 className="card-title">Reset your password</h2>
          <p className="auth-subtitle">Enter your email and we'll send a link to reset your password.</p>
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label className="label" htmlFor="forgot-email">Email address</label>
              <input className="input" type="text" id="forgot-email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Send reset link</button>
          </form>
          <div className="auth-switch">
            <Link to="/login" className="link-button">Back to log in</Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
