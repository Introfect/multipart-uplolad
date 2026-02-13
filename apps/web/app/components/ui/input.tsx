import * as React from "react"
import { cn } from "~/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
  variant?: "default" | "borderless"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, variant = "default", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        <input
          type={type}
          className={cn(
            "flex w-full bg-transparent text-[14px] leading-[20px] text-foreground transition-colors duration-200",
            "placeholder:text-muted-foreground/50",
            "focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
            variant === "default" && [
              "border border-input px-[17px] py-[13px]",
              "hover:border-input/40",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary",
              error && "border-destructive/50",
            ],
            variant === "borderless" && [
              "border-0 border-b-2 border-strong px-0 pb-3",
              "focus-visible:border-b-primary",
              error && "border-b-destructive/50",
            ],
            className
          )}
          ref={ref}
          {...props}
        />
        {error && helperText && (
          <div className="flex gap-1 items-center">
            <span className="material-symbols-outlined text-[12px] leading-[16px] text-destructive">
              error
            </span>
            <span className="text-[10px] leading-[15px] uppercase tracking-[0.25px] text-destructive">
              {helperText}
            </span>
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
