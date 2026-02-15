import type { UploadItem } from "~/types/form";
import { cn } from "~/lib/utils";
import { UploadProgress } from "~/components/ui/upload-progress";

interface UploadRowProps {
  upload: UploadItem;
  onCancel: () => void;
  onDelete: () => void;
  onRetry?: () => void;
  disableControls?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadRow({
  upload,
  onCancel,
  onDelete,
  onRetry,
  disableControls = false,
}: UploadRowProps) {
  const isUploading = upload.status === "uploading";
  const isQueued = upload.status === "queued";
  const isComplete = upload.status === "complete";
  const isError = upload.status === "error";
  const isActionDisabled = disableControls || upload.isCancelling;

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_100px_auto_50px] items-center gap-4 py-4 px-5 border-b border-white/5 transition-colors",
        isUploading && "bg-white/5 border-b-primary/20",
        isQueued && "opacity-50",
        !isUploading && !isQueued && "bg-white/[0.02] hover:bg-white/[0.05]"
      )}
    >
      {/* Left icon - loader circle when uploading, static icon otherwise */}
      <div className="flex-shrink-0">
        {isUploading ? (
          <svg
            className="w-5 h-5 text-primary animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span
            className={cn(
              "material-symbols-outlined text-xl",
              isQueued && "text-muted-foreground",
              isComplete && "text-primary",
              isError && "text-destructive"
            )}
          >
            {isQueued ? "hourglass_empty" : isError ? "error" : "description"}
          </span>
        )}
      </div>

      {/* Filename */}
      <div className="min-w-0">
        <span
          className={cn(
            "text-sm font-medium truncate block",
            isQueued ? "text-muted-foreground" : "text-white"
          )}
        >
          {upload.fileName}
        </span>
      </div>

      {/* Size */}
      <span className="text-xs font-mono text-muted-foreground text-right">
        {formatSize(upload.sizeBytes)}
      </span>

      {/* Status badge + Lottie progress when uploading */}
      <div className="flex items-center justify-end gap-3">
        {isUploading && (
          <UploadProgress progress={upload.progressPct ?? 0} size="sm" />
        )}
        <span
          className={cn(
            "text-[10px] font-bold uppercase py-1.5 px-3 whitespace-nowrap",
            isComplete && "text-primary bg-primary/10",
            isUploading && "text-primary bg-primary/10 italic",
            isQueued && "text-muted-foreground",
            isError && "text-destructive bg-destructive/10"
          )}
        >
          {isComplete && "Complete"}
          {isUploading && "Uploading"}
          {isQueued && "Queued"}
          {isError && "Error"}
        </span>
      </div>

      {/* Action button */}
      <div className="flex justify-end">
        {isError && onRetry ? (
          <button
            onClick={onRetry}
            disabled={isActionDisabled}
            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        ) : isUploading ? (
          <button
            onClick={onCancel}
            disabled={isActionDisabled}
            className="text-muted-foreground hover:text-white transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg">
              {upload.isCancelling ? "hourglass_top" : "cancel"}
            </span>
          </button>
        ) : isQueued ? (
          <button disabled className="text-muted-foreground/40 pointer-events-none">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        ) : (
          <button
            onClick={onDelete}
            disabled={isActionDisabled}
            className="text-muted-foreground hover:text-white transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        )}
      </div>

      {/* Error message - full width below */}
      {isError && upload.errorMessage && (
        <p className="col-span-5 text-xs text-destructive -mt-1 pl-12">
          {upload.errorMessage}
        </p>
      )}
    </div>
  );
}
