const sections = ['Dashboard', 'Records', 'Settings'] as const;

export default function App() {
  return (
    <div className="flex min-h-screen">
      <nav
        aria-label="Primary"
        className="w-48 shrink-0 border-r text-md"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ul className="stack-2 p-3">
          {sections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4">
        <h1 className="text-lg">HR Management System</h1>
      </main>
    </div>
  );
}
