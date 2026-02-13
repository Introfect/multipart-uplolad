import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center font-bold uppercase",
  {
    variants: {
      variant: {
        default: "bg-overlay text-muted-foreground px-[6px] py-[2px] text-[9px] leading-[13.5px]",
        live: "border border-primary text-primary px-[9px] py-[3px] text-[9px] leading-[13.5px]",
        dot: "size-[6px] rounded-full bg-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
