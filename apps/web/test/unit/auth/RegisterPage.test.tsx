import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../../../src/pages/auth/RegisterPage';
import { authApi } from '../../../src/lib/authApi';

vi.mock('../../../src/lib/authApi', () => ({ authApi: { register: vi.fn() } }));

const fill = async (label: string, value: string) =>
  userEvent.type(screen.getByLabelText(label), value);

beforeEach(() => vi.mocked(authApi.register).mockReset());

function renderPage() {
  render(<MemoryRouter><RegisterPage /></MemoryRouter>);
}

describe('RegisterPage', () => {
  it('shows the standalone disclaimer (AC27)', () => {
    renderPage();
    expect(screen.getByText(/not affiliated with or connected to facebook\.com/i)).toBeInTheDocument();
  });

  it('shows the success panel after registration (AC1/2)', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      ok: true, status: 201, data: { name: 'Jordan Lee', email: 'jordan@example.com' },
    });
    renderPage();
    await fill('Full name', 'Jordan Lee');
    await fill('Email address', 'jordan@example.com');
    await fill('Password', 'Fresh2Start');
    await userEvent.type(screen.getByLabelText('Date of birth'), '1998-06-15');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Account created')).toBeInTheDocument();
  });

  it('shows the field error returned by the API (AC4/6/8/10/31)', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      ok: false, status: 400, data: { field: 'password', message: 'Enter a password.' },
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter a password.')).toBeInTheDocument();
  });

  it('updates the password checklist live', async () => {
    renderPage();
    await fill('Password', 'Abcdefg1');
    expect(screen.getByText(/✓ One uppercase letter/)).toBeInTheDocument();
    expect(screen.getByText(/✓ At least 8 characters/)).toBeInTheDocument();
  });
});
