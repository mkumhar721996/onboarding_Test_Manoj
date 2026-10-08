export default function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <div className="field-error" id={id}>
      <span aria-hidden="true">⚠</span>
      <span>{message}</span>
    </div>
  );
}
