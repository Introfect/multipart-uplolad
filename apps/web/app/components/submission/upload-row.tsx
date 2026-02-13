import type { UploadItem } from "~/types/form";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface UploadRowProps {
  upload: UploadItem;
  onCancel: () => void;
  onDelete: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig = {
  complete: { label: "Complete", variant: "live" as const, icon: "check_circle" },
  uploading: { label: "Uploading", variant: "default" as const, icon: "sync" },
  queued: { label: "Queued", variant: "default" as const, icon: "schedule" },
  error: { label: "Error", variant: "default" as const, icon: "error" },
};

export function UploadRow({ upload, onCancel, onDelete }: UploadRowProps) {
  const config = statusConfig[upload.status];
  const isUploading = upload.status === "uploading";
  const isQueued = upload.status === "queued";

  return (
    <div className={cn("space-y-2", isQueued && "opacity-50")}>
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-[18px] text-primary">description</span>
        <span className="font-mono text-[13px] leading-[18px] text-foreground flex-1 truncate">
          {upload.fileName}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{formatSize(upload.sizeBytes)}</span>
        <Badge variant={config.variant}>{config.label}</Badge>
        {upload.status === "complete" && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        )}
        {isUploading && (
          <button onClick={onCancel} className="text-muted-foreground hover:text-destructive transition-colors">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>
      {isUploading && (
        <div className="relative h-0.5 w-full bg-[rgba(255,255,255,0.1)]">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
            style={{ width: `${upload.progressPct ?? 0}%` }}
          />
        </div>
      )}
      {upload.status === "error" && upload.errorMessage && (
        <p className="text-[11px] text-destructive">{upload.errorMessage}</p>
      )}
    </div>
  );
}
