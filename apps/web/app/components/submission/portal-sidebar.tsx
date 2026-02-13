import type { QuestionConfig } from "~/types/form";
import { cn } from "~/lib/utils";

interface PortalSidebarProps {
  questions: QuestionConfig[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function PortalSidebar({ questions, activeId, onSelect }: PortalSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-8 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-foreground flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] leading-[20px] text-background">museum</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[2px] leading-[15px] text-foreground">
            MIST Portal
          </span>
        </div>
      </div>

      {/* Questions nav */}
      <div className="p-8 flex-1 overflow-y-auto space-y-4">
        <span className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-muted-foreground">
          Questions
        </span>
        <nav className="space-y-1">
          {questions.map((q) => {
            const isActive = q.id === activeId;
            return (
              <button
                key={q.id}
                onClick={() => onSelect(q.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  isActive
                    ? "border-l-2 border-l-primary bg-overlay text-foreground font-semibold"
                    : "border-l-2 border-l-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="font-mono text-[11px] text-primary">
                  {String(q.order).padStart(2, "0")}
                </span>
                <span className="text-[12px] leading-[16px]">{q.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User */}
      <div className="p-8 border-t border-subtle flex items-center gap-3">
        <div className="size-8 rounded-full bg-overlay flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px] text-muted-foreground">person</span>
        </div>
        <div>
          <div className="text-[12px] leading-[16px] text-foreground font-bold">Arjun Mehta</div>
          <div className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-muted-foreground">
            Lead Architect
          </div>
        </div>
      </div>
    </div>
  );
}
