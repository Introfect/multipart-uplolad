import * as React from "react"
import { cn } from "~/lib/utils"

export interface FooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const Footer = React.forwardRef<HTMLDivElement, FooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between pt-[41px] pb-20 border-t border-subtle",
          className
        )}
        {...props}
      >
        <div className="flex gap-8">
          <div className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-[rgba(163,163,163,0.4)]">
            Framework: Tailwind CSS<br />v3
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-[rgba(163,163,163,0.4)]">
            Design: MIST<br />Internal
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-[rgba(163,163,163,0.4)]">
            Last Update:<br />10/2024
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <div className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-[rgba(163,163,163,0.4)]">
            Official Component<br />Library
          </div>
        </div>
      </div>
    )
  }
)
Footer.displayName = "Footer"

export { Footer }
