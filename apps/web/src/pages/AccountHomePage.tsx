import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'records', label: 'Records' },
  { id: 'settings', label: 'Settings' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function AccountHomePage() {
  const navigate = useNavigate();
  const { user, logout } = useSession();
  const [section, setSection] = useState<SectionId>('dashboard');
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  async function onLogout() {
    setLoggingOut(true);
    const wasRemembered = await logout();
    navigate('/login', {
      state: {
        notice: wasRemembered
          ? 'You’ve been logged out, and your saved sign-in has been removed from this device. Log in again to continue.'
          : 'You’ve been logged out.',
      },
    });
  }

  return (
    <div className="flex min-h-screen">
      <nav
        aria-label="Primary"
        className="w-48 shrink-0 border-r text-md"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="auth-brand" style={{ padding: 'var(--space-4) var(--space-3) 0' }}>
          <span className="auth-brand-mark">C</span> Connectly
        </div>
        <ul className="stack-2 p-3">
          {SECTIONS.map(({ id, label }) => (
            <li key={id}>
              <button
                className={`sidebar-link${section === id ? ' active' : ''}`}
                aria-current={section === id ? 'page' : undefined}
                onClick={() => setSection(id)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4" style={{ maxWidth: 880 }}>
        {section === 'dashboard' ? (
          <>
            <h1 className="text-lg">Welcome back, {user.name.split(' ')[0]}</h1>
            <p className="text-md" style={{ opacity: 0.7, marginBottom: 'var(--space-4)' }}>
              You're logged in to Connectly.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h3 className="card-title">Your account</h3>
                <dl className="kv">
                  <dt>Name</dt>
                  <dd>{user.name}</dd>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                  <dt>Status</dt>
                  <dd><span className="chip">Verified</span></dd>
                </dl>
              </div>
              <div className="card">
                <h3 className="card-title">Session</h3>
                <span className="chip">{user.rememberMe ? 'Remember me active' : 'Standard session'}</span>
                <p className="card-body" style={{ marginTop: 'var(--space-2)' }}>
                  {user.rememberMe
                    ? 'You’ll stay logged in on this device for 30 days without re-entering your password.'
                    : 'You’ll be logged out automatically after 30 minutes of inactivity.'}
                </p>
                <button className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={onLogout} disabled={loggingOut}>
                  {loggingOut ? 'Logging out…' : 'Log out'}
                </button>
              </div>
            </div>
          </>
        ) : null}
        {section === 'records' ? (
          <>
            <h1 className="text-lg">Records</h1>
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <p className="card-body">No records match this filter yet.</p>
            </div>
          </>
        ) : null}
        {section === 'settings' ? (
          <>
            <h1 className="text-lg">Settings</h1>
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3 className="card-title">Profile</h3>
              <dl className="kv">
                <dt>Name</dt>
                <dd>{user.name}</dd>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </dl>
              <button className="btn btn-secondary" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('/forgot-password')}>
                Change password
              </button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
