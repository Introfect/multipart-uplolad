import * as React from "react"
import { cn } from "~/lib/utils"

export interface FileUploadItemProps extends React.HTMLAttributes<HTMLDivElement> {
  filename: string
  progress: number
  onCancel?: () => void
}

const FileUploadItem = React.forwardRef<HTMLDivElement, FileUploadItemProps>(
  ({ className, filename, progress, onCancel, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-4 p-[17px] bg-overlay border border-strong",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="material-symbols-outlined text-[24px] leading-[24px] text-primary shrink-0">
            description
          </span>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[1px] leading-[15px] text-foreground truncate">
                {filename}
              </span>
              <span className="text-[10px] leading-[15px] text-primary shrink-0">
                {progress}%
              </span>
            </div>
            <div className="relative h-px w-full bg-[rgba(255,255,255,0.1)]">
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center ml-6 hover:opacity-70 transition-opacity"
            aria-label="Cancel upload"
          >
            <span className="material-symbols-outlined text-[18px] leading-[28px] text-muted-foreground">
              close
            </span>
          </button>
        )}
      </div>
    )
  }
)
FileUploadItem.displayName = "FileUploadItem"

export { FileUploadItem }
