import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';
import { SessionProvider } from '../../src/context/SessionContext';
import { authApi } from '../../src/lib/authApi';

vi.mock('../../src/lib/authApi', () => ({ authApi: { session: vi.fn() } }));

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  );

describe('App', () => {
  it('redirects unauthenticated visitors to the login page', async () => {
    vi.mocked(authApi.session).mockResolvedValue({ ok: false, status: 401, data: { reason: 'none' } });
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('redirects an inactivity-expired session to the session-expired page (AC21)', async () => {
    vi.mocked(authApi.session).mockResolvedValue({ ok: false, status: 401, data: { reason: 'inactivity' } });
    renderApp();
    expect(await screen.findByText('Your session has ended')).toBeInTheDocument();
  });

  it('renders the account home with primary navigation when authenticated', async () => {
    vi.mocked(authApi.session).mockResolvedValue({
      ok: true, status: 200, data: { name: 'Jordan Lee', email: 'jordan@example.com', rememberMe: false },
    });
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Welcome back, Jordan' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });
});
