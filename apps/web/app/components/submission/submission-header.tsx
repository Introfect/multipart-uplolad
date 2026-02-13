interface SubmissionHeaderProps {
  title: string;
  highlight: string;
  subtitle: string;
  deadlineLabel: string;
}

export function SubmissionHeader({ title, highlight, subtitle, deadlineLabel }: SubmissionHeaderProps) {
  return (
    <div className="h-24 shrink-0 border-b border-subtle backdrop-blur-mist bg-[rgba(10,10,10,0.5)] flex items-center justify-between px-8 lg:px-12">
      <div>
        <h1 className="text-[18px] leading-[24px] text-foreground font-light">
          {title} <span className="font-mono italic text-primary">{highlight}</span>
        </h1>
        <span className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-muted-foreground">
          {subtitle}
        </span>
      </div>
      <div className="text-right hidden sm:block">
        <span className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-muted-foreground block">
          Submission Deadline
        </span>
        <span className="font-mono text-[13px] leading-[18px] text-foreground">
          {deadlineLabel}
        </span>
      </div>
    </div>
  );
}
