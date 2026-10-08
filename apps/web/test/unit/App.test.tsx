import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/App';

describe('App', () => {
  it('renders the primary navigation and page title', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'HR Management System' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });
});
