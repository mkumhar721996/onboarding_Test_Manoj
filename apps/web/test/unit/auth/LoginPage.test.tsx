import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../../src/pages/auth/LoginPage';
import { authApi } from '../../../src/lib/authApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));
vi.mock('../../../src/context/SessionContext', () => ({ useSession: () => ({ setUser: vi.fn() }) }));
vi.mock('../../../src/lib/authApi', () => ({ authApi: { login: vi.fn() } }));

async function submit() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText('Email address'), 'jordan@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'fake-password');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  mockNavigate.mockReset();
  vi.mocked(authApi.login).mockReset();
});

describe('LoginPage', () => {
  it('navigates home on success (AC16/17)', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      ok: true, status: 200, data: { name: 'Jordan Lee', email: 'jordan@example.com', rememberMe: false },
    });
    await submit();
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows the invalid credentials banner (AC18/19)', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      ok: false, status: 401, data: { message: 'Incorrect email or password' },
    });
    await submit();
    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
  });

  it('shows the unverified banner (AC11/12)', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      ok: false, status: 401, data: { code: 'unverified', message: 'We sent a confirmation link to your inbox. Confirm your email, then log in.' },
    });
    await submit();
    expect(await screen.findByText('Verify your email to continue')).toBeInTheDocument();
  });

  it('shows lockout banners (AC36-39)', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      ok: false, status: 423, data: { message: 'Account temporarily locked. Try again at 3:15 PM.' },
    });
    await submit();
    expect(await screen.findByText('Account temporarily locked')).toBeInTheDocument();
    expect(screen.getByText('Try again at 3:15 PM.')).toBeInTheDocument();
  });
});
