import type { QuestionConfig } from "~/types/form";
import { cn } from "~/lib/utils";

interface QuestionNavListProps {
  questions: QuestionConfig[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function QuestionNavList({ questions, activeId, onSelect }: QuestionNavListProps) {
  return (
    <nav className="hidden lg:block w-56 shrink-0 space-y-1 pr-6 border-r border-subtle">
      {questions.map((q) => {
        const isActive = q.id === activeId;
        return (
          <button
            key={q.id}
            onClick={() => {
              onSelect(q.id);
              document.getElementById(q.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
              isActive
                ? "border-l-2 border-l-primary bg-overlay text-foreground font-semibold"
                : "border-l-2 border-l-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="font-mono text-[11px] text-primary">{String(q.order).padStart(2, "0")}</span>
            <span className="text-[12px] leading-[16px] truncate">{q.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
