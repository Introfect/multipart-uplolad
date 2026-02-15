import { useRef } from "react";
import type { QuestionConfig, UploadItem } from "~/types/form";
import { UploadRow } from "./upload-row";

interface QuestionCardProps {
  question: QuestionConfig;
  upload: UploadItem | null;
  totalQuestions: number;
  onAddFile: (file: File) => void;
  onCancel: () => void;
  onDelete: () => void;
  onRetry?: () => void;
  isReadOnly?: boolean;
}

function getStatusLabel(upload: UploadItem | null) {
  if (!upload) return null;
  if (upload.status === "complete") return "Active Inventory";
  if (upload.status === "uploading") return "Stream Processing";
  if (upload.status === "error") return "Error";
  return "Queued";
}

export function QuestionCard({
  question,
  upload,
  totalQuestions,
  onAddFile,
  onCancel,
  onDelete,
  onRetry,
  isReadOnly = false,
}: QuestionCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputId = `upload-input-${question.id}`;
  const statusLabel = getStatusLabel(upload);

  return (
    <div className="space-y-12">
      {/* Section header */}
      <div>
        <span className="inline-block px-3 py-1 border border-primary/30 text-primary text-[9px] font-bold mb-4 tracking-[0.2em] uppercase bg-primary/5">
          Section {question.order} of {totalQuestions}
        </span>
        <h3 className="text-3xl font-light text-white mb-4">
          {question.heading}
        </h3>
        <p className="font-mono text-muted-foreground text-base max-w-2xl leading-relaxed">
          {question.description}
        </p>
      </div>

      {/* Upload section */}
      <div>
        {/* Sub-question header */}
        <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-mono text-primary block mb-2">
              Q.{String(question.order).padStart(2, "0")}
            </span>
            <h4 className="text-lg text-white font-light tracking-tight italic font-mono">
              {question.title}
            </h4>
          </div>
          {statusLabel && (
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              {statusLabel}
            </span>
          )}
        </div>

        {/* File container */}
        <div className="space-y-0.5 border-t border-white/5">
          {upload ? (
            <UploadRow
              upload={upload}
              onCancel={onCancel}
              onDelete={onDelete}
              onRetry={
                isReadOnly
                  ? undefined
                  : () => {
                      if (onRetry) {
                        onRetry();
                      }
                      inputRef.current?.click();
                    }
              }
              disableControls={isReadOnly}
            />
          ) : isReadOnly ? (
            <div className="py-4 px-4 bg-white/[0.02] text-center">
              <p className="text-[11px] text-muted-foreground">
                This submission is locked after final submission.
              </p>
            </div>
          ) : null}

          {/* Add file button - always show unless read-only */}
          {!isReadOnly && (
            <label
              htmlFor={fileInputId}
              className="w-full flex items-center justify-center gap-2 py-4 border-b border-dashed border-white/10 text-muted-foreground hover:text-primary hover:bg-white/2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                add_circle
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {upload ? "Replace File" : "Add File"}
              </span>
              <span className="text-[9px] text-muted-foreground/60 ml-2">
                {question.accept.join(", ")} · max {question.maxSizeMB}MB
              </span>
            </label>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        id={fileInputId}
        type="file"
        className="hidden"
        accept={question.accept.join(",")}
        disabled={isReadOnly}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAddFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
