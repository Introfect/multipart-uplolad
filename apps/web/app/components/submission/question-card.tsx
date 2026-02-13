import { useRef } from "react";
import type { QuestionConfig, UploadItem } from "~/types/form";
import { Card } from "~/components/ui/card";
import { UploadRow } from "./upload-row";

interface QuestionCardProps {
  question: QuestionConfig;
  upload: UploadItem | null;
  onAddFile: (file: File) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function getStatusLabel(question: QuestionConfig, upload: UploadItem | null) {
  if (!upload) return question.required ? "Empty" : "Optional";
  if (upload.status === "complete") return "Complete";
  if (upload.status === "uploading") return "Uploading";
  if (upload.status === "error") return "Error";
  return "Queued";
}

export function QuestionCard({ question, upload, onAddFile, onCancel, onDelete }: QuestionCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const statusLabel = getStatusLabel(question, upload);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-primary font-medium">
            Q.{String(question.order).padStart(2, "0")}
          </span>
          <span className="font-mono text-[14px] leading-[20px] text-foreground italic">
            {question.title}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
          {statusLabel}
        </span>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-[12px] leading-[18px] text-muted-foreground mb-4">{question.description}</p>

        {upload ? (
          <UploadRow upload={upload} onCancel={onCancel} onDelete={onDelete} />
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border border-dashed border-subtle py-6 flex flex-col items-center gap-2 hover:bg-overlay transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">add_circle</span>
            <span className="text-[11px] text-muted-foreground">
              Click to upload — {question.accept.join(", ")} up to {question.maxSizeMB}MB
            </span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={question.accept.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAddFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </Card>
  );
}
