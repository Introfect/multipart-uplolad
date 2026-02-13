import * as React from "react";

interface DashboardLayoutProps {
  heroContent: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ heroContent, children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left hero panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[60%] relative">
        {heroContent}
      </div>

      {/* Right content panel */}
      <div className="w-full lg:w-[40%] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
