import * as React from "react"
import { cn } from "~/lib/utils"

export interface CountdownTimerProps extends React.HTMLAttributes<HTMLDivElement> {
  days?: number
  hours?: number
  minutes?: number
  label?: string
}

const CountdownTimer = React.forwardRef<HTMLDivElement, CountdownTimerProps>(
  ({ className, days = 0, hours = 0, minutes = 0, label = "Submission Closes In", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-[21px] bg-overlay border border-strong",
          className
        )}
        {...props}
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.9px] leading-[13.5px] text-center text-muted-foreground">
          {label}
        </span>
        <div className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <span className="text-[20px] font-light leading-[28px] text-foreground">
              {String(days).padStart(2, '0')}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[-0.4px] leading-[28px] text-primary">
              Day
            </span>
          </div>
          <span className="text-[20px] font-light leading-[28px] text-foreground opacity-30">
            :
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[20px] font-light leading-[28px] text-foreground">
              {String(hours).padStart(2, '0')}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[-0.4px] leading-[28px] text-primary">
              Hrs
            </span>
          </div>
          <span className="text-[20px] font-light leading-[28px] text-foreground opacity-30">
            :
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[20px] font-light leading-[28px] text-foreground">
              {String(minutes).padStart(2, '0')}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[-0.4px] leading-[28px] text-primary">
              Min
            </span>
          </div>
        </div>
      </div>
    )
  }
)
CountdownTimer.displayName = "CountdownTimer"

export { CountdownTimer }
