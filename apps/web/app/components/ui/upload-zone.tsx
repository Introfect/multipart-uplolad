import * as React from "react"
import { cn } from "~/lib/utils"

export interface UploadZoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop'> {
  onDrop?: (files: FileList) => void
  isDragOver?: boolean
}

const UploadZone = React.forwardRef<HTMLDivElement, UploadZoneProps>(
  ({ className, onDrop, isDragOver, ...props }, ref) => {
    const [dragOver, setDragOver] = React.useState(false)

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(true)
    }

    const handleDragLeave = () => {
      setDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (onDrop && e.dataTransfer.files) {
        onDrop(e.dataTransfer.files)
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-4 items-center justify-center p-[42px] border-2 border-dashed border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] transition-colors",
          (dragOver || isDragOver) && "border-primary bg-[rgba(212,175,55,0.05)]",
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...props}
      >
        <span className="material-symbols-outlined text-[36px] leading-[40px] text-[rgba(163,163,163,0.4)]">
          cloud_upload
        </span>
        <div className="flex flex-col gap-1 items-center">
          <p className="text-[12px] font-medium leading-[16px] text-center text-white">
            Drag and drop technical drawings
          </p>
          <p className="text-[10px] leading-[15px] text-center text-muted-foreground">
            PDF, DWG or BIM (Max 50MB)
          </p>
        </div>
      </div>
    )
  }
)
UploadZone.displayName = "UploadZone"

export { UploadZone }
