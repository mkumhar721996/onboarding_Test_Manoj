import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Banner from '../../components/auth/Banner';
import FieldError from '../../components/auth/FieldError';
import PasswordChecklist from '../../components/auth/PasswordChecklist';
import { authApi } from '../../lib/authApi';

type Field = 'name' | 'email' | 'password' | 'dob';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', dob: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string } | null>(null);

  const set = (field: Field) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    const res = await authApi.register({ ...values, name: values.name.trim(), email: values.email.trim() });
    setSubmitting(false);
    if (res.ok) {
      setCreated(res.data as { name: string; email: string });
    } else {
      setErrors({ [res.data.field as Field]: res.data.message });
    }
  }

  const input = (field: Field, label: string, type: string, autoComplete: string) => (
    <div className="field">
      <label className="label" htmlFor={`reg-${field}`}>{label}</label>
      <input
        className={`input${errors[field] ? ' has-error' : ''}`}
        type={type}
        id={`reg-${field}`}
        name={field}
        autoComplete={autoComplete}
        value={values[field]}
        onChange={set(field)}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `err-${field}` : undefined}
      />
      {field === 'password' ? <PasswordChecklist password={values.password} /> : null}
      {field === 'dob' ? <div className="field-hint">You must be 13 or older to register.</div> : null}
      <FieldError id={`err-${field}`} message={errors[field]} />
    </div>
  );

  return (
    <AuthShell
      footnote="Connectly is a standalone prototype built for this story's registration & login flow. No data leaves this page and no calls are made to any real service."
    >
      {created ? (
        <div className="card auth-card">
          <Banner kind="success" title="Account created">
            Welcome to Connectly, {created.name}.
          </Banner>
          <p className="card-body">
            We've sent a confirmation link to <strong>{created.email}</strong>. You'll need to confirm
            your email before you can log in.
          </p>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={() => navigate('/verify-email', { state: { email: created.email } })}
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="card auth-card">
          <h2 className="card-title">Create your account</h2>
          <p className="auth-subtitle">
            This is a standalone demo account system — it is not affiliated with or connected to
            facebook.com.
          </p>
          <form onSubmit={onSubmit} noValidate>
            {input('name', 'Full name', 'text', 'name')}
            {input('email', 'Email address', 'text', 'email')}
            {input('password', 'Password', 'password', 'new-password')}
            {input('dob', 'Date of birth', 'date', 'bday')}
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <div className="auth-switch">
            Already have an account? <Link to="/login" className="link-button">Log in</Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
