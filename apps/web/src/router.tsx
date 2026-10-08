import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './context/SessionContext';
import AccountHomePage from './pages/AccountHomePage';
import EmailConfirmationPage from './pages/auth/EmailConfirmationPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SessionExpiredPage from './pages/auth/SessionExpiredPage';
import VerifyEmailPendingPage from './pages/auth/VerifyEmailPendingPage';

function RequireSession() {
  const { user, loading, expiredReason } = useSession();
  if (loading) return null;
  if (user) return <AccountHomePage />;
  if (expiredReason === 'inactivity' || expiredReason === 'remember') {
    return <Navigate to={`/session-expired?reason=${expiredReason}`} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RequireSession />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPendingPage />} />
      <Route path="/confirm-email" element={<EmailConfirmationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/session-expired" element={<SessionExpiredPage />} />
    </Routes>
  );
}
