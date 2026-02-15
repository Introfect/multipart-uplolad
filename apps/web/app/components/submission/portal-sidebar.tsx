import { DateTime } from "luxon";
import type { QuestionConfig, UploadItem } from "~/types/form";
import type { UploadQuestionId } from "@repo/upload-contracts";
import { cn } from "~/lib/utils";

interface PortalSidebarProps {
  questions: QuestionConfig[];
  activeId: UploadQuestionId;
  onSelect: (id: UploadQuestionId) => void;
  uploads: Record<UploadQuestionId, UploadItem | null>;
  deadlineIso: string;
  userName: string;
  userEmail: string;
}

function getUploadStatusIcon(upload: UploadItem | null): string {
  if (!upload) return "radio_button_unchecked";
  if (upload.status === "complete") return "check_circle";
  if (upload.status === "uploading") return "radio_button_checked";
  if (upload.status === "error") return "error";
  return "radio_button_unchecked";
}

function getCompletedCount(
  questions: QuestionConfig[],
  uploads: Record<UploadQuestionId, UploadItem | null>,
): number {
  return questions.filter((q) => {
    const upload = uploads[q.id as UploadQuestionId];
    return upload?.status === "complete";
  }).length;
}

function formatDeadline(isoDate: string): string {
  return DateTime.fromISO(isoDate)
    .setZone("local")
    .toLocaleString(DateTime.DATETIME_FULL);
}

export function PortalSidebar({
  questions,
  activeId,
  onSelect,
  uploads,
  deadlineIso,
  userName,
  userEmail,
}: PortalSidebarProps) {
  const completedCount = getCompletedCount(questions, uploads);
  const totalCount = questions.length;
  const formattedDeadline = formatDeadline(deadlineIso);

  return (
    <div className="flex flex-col h-full">
      {/* Brand + Progress */}
      <div className="p-8 border-b border-white/5">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-background">
              architecture
            </span>
          </div>
          <h1 className="text-[11px] font-bold tracking-[0.2em] text-white uppercase">
            Mist{" "}
            <span className="font-light text-muted-foreground">Portal</span>
          </h1>
        </div>

        <div className="space-y-1">
          <h2 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">
            Submission Progress
          </h2>
          <div className="flex items-center gap-3 py-2">
            <span
              className={cn(
                "material-symbols-outlined text-lg",
                completedCount === totalCount
                  ? "text-primary"
                  : "text-muted-foreground/40",
              )}
            >
              {completedCount === totalCount
                ? "check_circle"
                : "radio_button_unchecked"}
            </span>
            <span className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} documents uploaded
            </span>
          </div>
        </div>
      </div>

      {/* Questions nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar p-8 overscroll-contain">
        <h3 className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-6">
          Technical Sections
        </h3>
        <div className="space-y-4">
          {questions.map((q) => {
            const isActive = q.id === activeId;
            const upload = uploads[q.id as UploadQuestionId];
            const statusIcon = getUploadStatusIcon(upload);

            return (
              <button
                key={q.id}
                onClick={() => onSelect(q.id as UploadQuestionId)}
                className={cn(
                  "w-full flex gap-4 items-start text-left transition-colors py-2",
                  isActive
                    ? "border-l-2 border-primary pl-4 -ml-4 bg-white/5"
                    : "group",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-mono mt-0.5",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {String(q.order).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-xs block truncate transition-colors",
                      isActive
                        ? "text-white font-semibold"
                        : "text-muted-foreground group-hover:text-white",
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
        </div>
      </nav>

      {/* Footer - User info */}
      <div className="p-8 border-t border-white/5">
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[14px]">
              person
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span
              className="text-[10px] font-bold text-white truncate"
              title={userName}
            >
              {userName}
            </span>
            <span className="text-[9px] uppercase tracking-tight text-muted-foreground truncate">
              Submit by {formattedDeadline}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
