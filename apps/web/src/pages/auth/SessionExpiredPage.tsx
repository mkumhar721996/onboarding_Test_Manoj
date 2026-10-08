import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Banner from '../../components/auth/Banner';

export default function SessionExpiredPage() {
  const remember = useSearchParams()[0].get('reason') === 'remember';
  return (
    <AuthShell>
      <div className="card auth-card">
        {remember ? (
          <Banner kind="error" title="Your saved sign-in has expired">
            It's been 30 days since you last logged in, so you'll need to sign in again.
          </Banner>
        ) : (
          <Banner kind="error" title="Your session has ended">
            You were signed out after 30 minutes of inactivity.
          </Banner>
        )}
        <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-3)' }}>
          Log in again
        </Link>
      </div>
    </AuthShell>
  );
}
