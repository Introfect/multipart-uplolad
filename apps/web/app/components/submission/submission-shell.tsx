interface SubmissionShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function SubmissionShell({ sidebar, children }: SubmissionShellProps) {
  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      <aside className="hidden lg:flex w-80 shrink-0 border-r border-subtle flex-col bg-card">
        {sidebar}
      </aside>
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
