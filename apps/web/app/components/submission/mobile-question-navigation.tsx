import { useState } from "react";
import type { QuestionConfig, UploadItem } from "~/types/form";
import type { UploadQuestionId } from "@repo/upload-contracts";
import { cn } from "~/lib/utils";

interface MobileQuestionNavigationProps {
  questions: QuestionConfig[];
  activeId: UploadQuestionId;
  onSelect: (id: UploadQuestionId) => void;
  uploads: Record<UploadQuestionId, UploadItem | null>;
  deadlineLabel: string;
}

function getUploadStatusIcon(upload: UploadItem | null): string {
  if (!upload) return "radio_button_unchecked";
  if (upload.status === "complete") return "check_circle";
  if (upload.status === "uploading") return "radio_button_checked";
  if (upload.status === "error") return "error";
  return "radio_button_unchecked";
}

export function MobileQuestionNavigation({
  questions,
  activeId,
  onSelect,
  uploads,
  deadlineLabel,
}: MobileQuestionNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeQuestion = questions.find((q) => q.id === activeId);
  const activeUpload = activeQuestion
    ? uploads[activeQuestion.id as UploadQuestionId]
    : null;

  const handleSelect = (id: UploadQuestionId) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden sticky top-0 z-30 bg-card border-b border-white/5">
      {/* Collapsed trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <span
          className={cn(
            "material-symbols-outlined text-[16px]",
            activeUpload?.status === "complete"
              ? "text-primary"
              : activeUpload?.status === "uploading"
                ? "text-primary"
                : "text-muted-foreground/40",
          )}
        >
          {getUploadStatusIcon(activeUpload)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white font-medium truncate">
            {activeQuestion?.title}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Section {activeQuestion?.order} of {questions.length}
          </div>
        </div>
        <span
          className={cn(
            "material-symbols-outlined text-[20px] text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        >
          expand_more
        </span>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="border-t border-white/5 bg-background max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="p-4 border-b border-white/5">
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
              Submission Progress
            </span>
            <span className="text-[9px] text-muted-foreground block mt-1">
              Submit by: {deadlineLabel}
            </span>
          </div>

          <nav className="p-2">
            {questions.map((q) => {
              const isActive = q.id === activeId;
              const upload = uploads[q.id as UploadQuestionId];
              const statusIcon = getUploadStatusIcon(upload);

              return (
                <button
                  key={q.id}
                  onClick={() => handleSelect(q.id as UploadQuestionId)}
                  className={cn(
                    "w-full flex gap-4 items-start px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-l-2 border-primary bg-white/5"
                      : "hover:bg-white/[0.02] active:bg-white/5",
                  )}
                >
                  <span className="text-[10px] font-mono text-primary mt-0.5">
                    {String(q.order).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-xs block truncate",
                        isActive
                          ? "text-white font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {q.title}
                    </span>
                    {upload?.status === "complete" && (
                      <span className="text-[9px] text-primary uppercase tracking-wider">
                        Uploaded
                      </span>
                    )}
                    {upload?.status === "uploading" && (
                      <span className="text-[9px] text-primary uppercase tracking-wider">
                        Uploading...
                      </span>
                    )}
                    {!upload && q.required && (
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                        Required
                      </span>
                    )}
                    {!upload && !q.required && (
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                        Optional
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
