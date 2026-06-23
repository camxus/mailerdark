export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-lg font-semibold tracking-tight text-ink">Mailerdark</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <h1 className="mb-5 text-lg font-semibold text-ink">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
