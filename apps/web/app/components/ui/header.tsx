import * as React from "react"
import { cn } from "~/lib/utils"
import { Button } from "./button"

export interface BreadcrumbItem {
  label: string
  active?: boolean
}

export interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  breadcrumbs?: BreadcrumbItem[]
  showSaveStatus?: boolean
  saveTime?: string
  onExport?: () => void
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({
    className,
    breadcrumbs = [],
    showSaveStatus = false,
    saveTime,
    onExport,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between h-16 px-10 backdrop-blur-mist bg-[rgba(10,10,10,0.5)] border-b border-subtle",
          className
        )}
        {...props}
      >
        {/* Breadcrumbs */}
        <div className="flex items-center gap-4">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-[2px] leading-[15px] text-[rgba(255,255,255,0.2)]">
                  /
                </span>
              )}
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-[2px] leading-[15px]",
                  item.active ? "text-white" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          {showSaveStatus && (
            <div className="flex items-center gap-2">
              <div className="size-[6px] rounded-full bg-success shadow-[0px_0px_8px_0px_rgba(34,197,94,0.4)]" />
              <span className="text-[10px] uppercase tracking-[1px] leading-[15px] text-muted-foreground">
                Auto-saved {saveTime || "12:04"}
              </span>
            </div>
          )}
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              Export Assets
            </Button>
          )}
        </div>
      </div>
    )
  }
)
Header.displayName = "Header"

export { Header }
