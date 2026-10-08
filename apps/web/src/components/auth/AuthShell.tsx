import type { ReactNode } from 'react';

export default function AuthShell({ children, footnote }: { children: ReactNode; footnote?: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <span className="auth-brand-mark">C</span> Connectly
      </div>
      {children}
      {footnote ? <p className="auth-footnote">{footnote}</p> : null}
    </div>
  );
}
