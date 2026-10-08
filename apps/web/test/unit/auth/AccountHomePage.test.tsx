import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AccountHomePage from '../../../src/pages/AccountHomePage';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
let rememberMe = false;
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));
vi.mock('../../../src/context/SessionContext', () => ({
  useSession: () => ({
    user: { name: 'Jordan Lee', email: 'jordan@example.com', rememberMe },
    logout: mockLogout,
  }),
}));

beforeEach(() => {
  mockNavigate.mockReset();
  mockLogout.mockReset();
  rememberMe = false;
});

describe('AccountHomePage', () => {
  it('greets the user and shows the primary navigation (AC17)', () => {
    render(<MemoryRouter><AccountHomePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Welcome back, Jordan' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('logs out and redirects to /login (AC34/35)', async () => {
    rememberMe = false;
    mockLogout.mockResolvedValue(false);
    render(<MemoryRouter><AccountHomePage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await vi.waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { notice: 'You’ve been logged out.' },
      }),
    );
  });

  it('mentions the removed saved sign-in for remembered sessions (AC32/33)', async () => {
    rememberMe = true;
    mockLogout.mockResolvedValue(true);
    render(<MemoryRouter><AccountHomePage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(mockNavigate.mock.calls[0][1].state.notice).toMatch(/saved sign-in has been removed/);
  });
});
