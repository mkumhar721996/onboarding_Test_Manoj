import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SessionExpiredPage from '../../../src/pages/auth/SessionExpiredPage';

const renderAt = (url: string) =>
  render(<MemoryRouter initialEntries={[url]}><SessionExpiredPage /></MemoryRouter>);

describe('SessionExpiredPage', () => {
  it('explains inactivity expiry (AC20/21)', () => {
    renderAt('/session-expired?reason=inactivity');
    expect(screen.getByText('Your session has ended')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in again' })).toHaveAttribute('href', '/login');
  });

  it('explains remember-me expiry (AC29)', () => {
    renderAt('/session-expired?reason=remember');
    expect(screen.getByText('Your saved sign-in has expired')).toBeInTheDocument();
  });
});
