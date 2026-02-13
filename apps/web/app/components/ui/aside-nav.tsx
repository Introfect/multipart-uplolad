import * as React from "react"
import { cn } from "~/lib/utils"

export interface NavItem {
  label: string
  icon?: string
  badge?: number | "dot"
  active?: boolean
}

export interface AsideNavProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: NavItem[]
}

const AsideNav = React.forwardRef<HTMLDivElement, AsideNavProps>(
  ({ className, items = [], ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col w-[288px] h-full bg-card border-r border-subtle shrink-0",
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-8 border-b border-subtle">
          <div className="flex items-center justify-center size-8 bg-white shrink-0">
            <span className="material-symbols-outlined text-[20px] leading-[28px] text-card">
              architecture
            </span>
          </div>
          <h1 className="text-[14px] font-bold uppercase tracking-[2.8px] leading-[20px]">
            <span className="text-white">Mist </span>
            <span className="font-light text-muted-foreground">System</span>
          </h1>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between py-3 px-3",
                item.active && "bg-overlay border-l-2 border-l-primary pl-[14px]"
              )}
            >
              <div className="flex items-center gap-2">
                {item.icon && (
                  <span className={cn(
                    "material-symbols-outlined text-[14px] leading-[20px]",
                    item.active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.icon}
                  </span>
                )}
                <span className={cn(
                  "text-[12px] font-medium tracking-[0.3px] leading-[16px]",
                  item.active ? "text-white" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
              {item.badge === "dot" ? (
                <div className="size-[6px] rounded-full bg-primary shrink-0" />
              ) : item.badge ? (
                <div className="bg-overlay px-[6px] py-[2px]">
                  <span className="text-[9px] leading-[13.5px] text-muted-foreground">
                    {item.badge}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex items-center gap-3 p-8 border-t border-subtle opacity-50">
          <div className="flex items-center justify-center size-8 bg-secondary rounded-full shrink-0">
            <span className="material-symbols-outlined text-[14px] leading-[20px] text-foreground">
              person
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[1px] leading-[15px] text-foreground">
            Admin Panel
          </span>
        </div>
      </div>
    )
  }
)
AsideNav.displayName = "AsideNav"

export { AsideNav }
