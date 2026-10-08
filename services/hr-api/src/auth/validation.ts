const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function passwordComplexityErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('length');
  if (!/[A-Z]/.test(password)) errors.push('uppercase');
  if (!/[a-z]/.test(password)) errors.push('lowercase');
  if (!/\d/.test(password)) errors.push('number');
  return errors;
}

export function isPasswordValid(password: string): boolean {
  return passwordComplexityErrors(password).length === 0;
}

export function calculateAge(dob: string, now: Date = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}
