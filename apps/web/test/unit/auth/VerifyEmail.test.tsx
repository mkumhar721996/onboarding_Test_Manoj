import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import EmailConfirmationPage from '../../../src/pages/auth/EmailConfirmationPage';
import { authApi } from '../../../src/lib/authApi';

vi.mock('../../../src/lib/authApi', () => ({
  authApi: { verifyEmail: vi.fn(), resendVerification: vi.fn() },
}));

const renderPage = () =>
  render(<MemoryRouter initialEntries={['/confirm-email?token=fake-token']}><EmailConfirmationPage /></MemoryRouter>);

describe('EmailConfirmationPage', () => {
  it('confirms a valid link (AC13/14)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({ ok: true, status: 200, data: {} });
    renderPage();
    expect(await screen.findByText('Email verified')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('offers a resend for an expired link (AC15)', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue({
      ok: false, status: 410, data: { email: 'jordan@example.com' },
    });
    vi.mocked(authApi.resendVerification).mockResolvedValue({ ok: true, status: 200, data: {} });
    renderPage();
    expect(await screen.findByText('This link has expired')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));
    expect(authApi.resendVerification).toHaveBeenCalledWith('jordan@example.com');
    expect(await screen.findByText(/new confirmation link has been sent/i)).toBeInTheDocument();
  });
});
