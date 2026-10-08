import { passwordChecks } from '../../lib/passwordRules';

const LABELS = [
  { id: 'len', label: 'At least 8 characters' },
  { id: 'upper', label: 'One uppercase letter' },
  { id: 'lower', label: 'One lowercase letter' },
  { id: 'number', label: 'One number' },
] as const;

export default function PasswordChecklist({ password }: { password: string }) {
  const checks = passwordChecks(password);
  return (
    <ul className="checklist" aria-live="polite">
      {LABELS.map(({ id, label }) => (
        <li key={id} className={checks[id] ? 'met' : undefined}>
          {checks[id] ? '✓' : '○'} {label}
        </li>
      ))}
    </ul>
  );
}
