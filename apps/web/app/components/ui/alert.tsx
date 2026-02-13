import * as React from "react"
import { cn } from "~/lib/utils"

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex gap-4 items-start border-l-4 border-l-primary bg-[rgba(212,175,55,0.1)] p-6 pl-7",
      className
    )}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { icon?: string }
>(({ className, icon = "priority_high", ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col shrink-0", className)} {...props}>
    <span className="material-symbols-outlined text-[24px] leading-[24px] text-primary">
      {icon}
    </span>
  </div>
))
AlertIcon.displayName = "AlertIcon"

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn(
      "text-[12px] font-bold uppercase tracking-[1.2px] leading-[16px] text-primary",
      className
    )}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "font-mono text-[14px] leading-[19.25px] text-foreground",
      className
    )}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1", className)}
    {...props}
  />
))
AlertContent.displayName = "AlertContent"

export { Alert, AlertIcon, AlertTitle, AlertDescription, AlertContent }
