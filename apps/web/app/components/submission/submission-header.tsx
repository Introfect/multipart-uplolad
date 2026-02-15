interface SubmissionHeaderProps {
  title: string;
  highlight: string;
  subtitle: string;
  deadlineLabel: string;
}

export function SubmissionHeader({ title, highlight, subtitle, deadlineLabel }: SubmissionHeaderProps) {
  return (
    <header className="h-24 shrink-0 border-b border-white/5 flex items-center justify-between px-8 lg:px-12 bg-background/50 backdrop-blur-xl z-30">
      <div>
        <h2 className="text-xl font-light text-white tracking-tight">
          Museum of <span className="font-mono italic text-primary">Innovation Science and Technology</span>
        </h2>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">
            Submission Deadline
          </span>
          <span className="text-xs font-mono text-white">{deadlineLabel}</span>
        </div>
      </div>
    </header>
  );
}
