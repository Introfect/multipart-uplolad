import * as React from "react";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";

export interface AuthFormWrapperProps {
  icon?: React.ReactNode;
  heading: string;
  subheading?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AuthFormWrapper({
  icon = (
    <span className="material-symbols-outlined text-[32px] leading-[40px] text-primary">
      fingerprint
    </span>
  ),
  heading,
  subheading,
  footer,
  children,
  className,
}: AuthFormWrapperProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Icon */}
      <div className="size-20 border-2 border-primary flex items-center justify-center">
        {icon}
      </div>

      {/* Heading */}
      <div className="space-y-3">
        <h1 className="text-[36px] font-light leading-[44px] tracking-[-0.9px] text-foreground">
          {heading}
        </h1>
        {subheading && (
          <p className="font-mono text-[18px] leading-[26px] text-muted-foreground">
            {subheading}
          </p>
        )}
      </div>

      {/* Form content */}
      {children}

      {/* Footer */}
      {footer || (
        <div className="space-y-6 pt-8">
          <Separator />
          <div className="flex flex-col gap-4 items-center">
            <span className="text-[10px] uppercase tracking-[1px] leading-[15px] text-muted-foreground">
              Authenticated access only
            </span>
            <div className="flex gap-4 text-[10px] leading-[15px] text-muted-foreground">
              <a href="/support" className="hover:text-primary transition-colors">
                Support
              </a>
              <span>|</span>
              <a href="/legal" className="hover:text-primary transition-colors">
                Legal
              </a>
              <span>|</span>
              <a href="/privacy" className="hover:text-primary transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
