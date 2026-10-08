import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Banner from '../../components/auth/Banner';
import FieldError from '../../components/auth/FieldError';
import PasswordChecklist from '../../components/auth/PasswordChecklist';
import { authApi } from '../../lib/authApi';
import { PASSWORD_COMPLEXITY_MESSAGE, isPasswordValid } from '../../lib/passwordRules';

type Phase = 'form' | 'updated' | 'expired';

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [phase, setPhase] = useState<Phase>('form');
  const [expiredEmail, setExpiredEmail] = useState<string>();
  const [requested, setRequested] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!isPasswordValid(password)) {
      setError(PASSWORD_COMPLEXITY_MESSAGE);
      return;
    }
    const res = await authApi.resetPassword(token, password);
    if (res.ok) setPhase('updated');
    else if (res.status === 410) {
      setExpiredEmail(res.data.email);
      setPhase('expired');
    } else setError(res.data.message);
  }

  async function requestNewLink() {
    if (expiredEmail) await authApi.forgotPassword(expiredEmail);
    setRequested(true);
  }

  return (
    <AuthShell>
      <div className="card auth-card">
        {phase === 'form' ? (
          <>
            <h2 className="card-title">Choose a new password</h2>
            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label className="label" htmlFor="reset-password">New password</label>
                <input className={`input${error ? ' has-error' : ''}`} type="password" id="reset-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <PasswordChecklist password={password} />
                <FieldError id="err-reset-password" message={error} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Update password</button>
            </form>
          </>
        ) : null}
        {phase === 'updated' ? (
          <>
            <Banner kind="success" title="Password updated">You can now log in with your new password.</Banner>
            <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-4)' }}>Log in</Link>
          </>
        ) : null}
        {phase === 'expired' ? (
          <>
            <Banner kind="error" title="This link has expired">Password reset links are only valid for 1 hour.</Banner>
            <button className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-3)' }} onClick={requestNewLink}>
              Request a new reset link
            </button>
            {requested ? (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Banner kind="success">If an account exists for this email, a new reset link has been sent.</Banner>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AuthShell>
  );
}
