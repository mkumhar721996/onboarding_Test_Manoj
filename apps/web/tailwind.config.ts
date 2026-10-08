import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fg: 'var(--color-fg)',
        bg: 'var(--color-bg)',
        primary: 'var(--color-primary)',
        border: 'var(--color-border)',
        'surface-subtle': 'var(--color-surface-subtle)',
      },
      fontFamily: {
        base: 'var(--font-family-base)',
      },
    },
  },
  plugins: [],
} satisfies Config;
