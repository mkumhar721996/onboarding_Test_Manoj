import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../../../src/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../../../src/pages/auth/ResetPasswordPage';
import { authApi } from '../../../src/lib/authApi';

vi.mock('../../../src/lib/authApi', () => ({
  authApi: { forgotPassword: vi.fn(), resetPassword: vi.fn() },
}));

describe('ForgotPasswordPage', () => {
  it('shows the generic message (AC23/28)', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue({ ok: true, status: 200, data: {} });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Email address'), 'nobody@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(/If an account exists for nobody@example.com, a password reset link has been sent/)).toBeInTheDocument();
  });
});

describe('ResetPasswordPage', () => {
  const renderPage = () =>
    render(<MemoryRouter initialEntries={['/reset-password?token=fake-token']}><ResetPasswordPage /></MemoryRouter>);

  it('rejects a weak password client-side (AC24)', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('New password'), 'weak');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('confirms the update (AC25)', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue({ ok: true, status: 200, data: {} });
    renderPage();
    await userEvent.type(screen.getByLabelText('New password'), 'NewPass1x');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Password updated')).toBeInTheDocument();
  });

  it('shows the expired state (AC26)', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue({
      ok: false, status: 410, data: { email: 'jordan@example.com' },
    });
    renderPage();
    await userEvent.type(screen.getByLabelText('New password'), 'NewPass1x');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('This link has expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request a new reset link' })).toBeInTheDocument();
  });
});
