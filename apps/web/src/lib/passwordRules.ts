export const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.';

export function passwordChecks(pw: string) {
  return {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
  };
}

export function isPasswordValid(pw: string): boolean {
  return Object.values(passwordChecks(pw)).every(Boolean);
}
