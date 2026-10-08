import type { ReactNode } from 'react';

export default function Banner({
  kind,
  title,
  children,
}: {
  kind: 'error' | 'success';
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="banner-icon" aria-hidden="true">
        {kind === 'error' ? '⚠' : '✓'}
      </span>
      <div className="banner-text">
        {title ? <strong>{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}
