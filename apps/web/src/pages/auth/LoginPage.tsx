import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Banner from '../../components/auth/Banner';
import { useSession, type SessionUser } from '../../context/SessionContext';
import { authApi } from '../../lib/authApi';

interface Problem {
  title: string;
  body: string;
}

function problemFor(status: number, data: Record<string, any>): Problem {
  if (status === 423) {
    const stillLocked = /still locked/i.test(data.message);
    return {
      title: stillLocked ? 'Account still locked' : 'Account temporarily locked',
      body: String(data.message).replace(/^Account (still|temporarily) locked\.\s*/i, ''),
    };
  }
  if (data.code === 'unverified') {
    return { title: 'Verify your email to continue', body: data.message };
  }
  return { title: data.message ?? 'Incorrect email or password', body: 'Check your details and try again.' };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useSession();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setProblem(null);
    setSubmitting(true);
    const res = await authApi.login({ email: email.trim(), password, rememberMe });
    setSubmitting(false);
    if (res.ok) {
      setUser(res.data as SessionUser);
      navigate('/');
    } else {
      setProblem(problemFor(res.status, res.data));
    }
  }

  return (
    <AuthShell>
      <div className="card auth-card">
        <h2 className="card-title">Log in</h2>
        <p className="auth-subtitle">Welcome back to Connectly.</p>
        {problem ? (
          <Banner kind="error" title={problem.title}>{problem.body}</Banner>
        ) : notice ? (
          <Banner kind="success">{notice}</Banner>
        ) : null}
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="login-email">Email address</label>
            <input className="input" type="text" id="login-email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="login-password">Password</label>
            <input className="input" type="password" id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-row-split">
            <div className="checkbox-row">
              <input type="checkbox" id="login-remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <label htmlFor="login-remember">Remember me for 30 days</label>
            </div>
            <Link to="/forgot-password" className="link-button">Forgot password?</Link>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="auth-switch">
          New to Connectly? <Link to="/register" className="link-button">Create an account</Link>
        </div>
      </div>
    </AuthShell>
  );
}
