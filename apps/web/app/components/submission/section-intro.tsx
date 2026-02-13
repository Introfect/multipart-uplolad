import { Badge } from "~/components/ui/badge";

interface SectionIntroProps {
  current: number;
  total: number;
  title: string;
  description: string;
}

export function SectionIntro({ current, total, title, description }: SectionIntroProps) {
  return (
    <div className="space-y-4">
      <Badge variant="live">Section {current} of {total}</Badge>
      <h2 className="text-3xl font-light text-foreground">{title}</h2>
      <p className="font-mono text-[15px] leading-[22px] text-muted-foreground italic max-w-2xl">
        {description}
      </p>
    </div>
  );
}
