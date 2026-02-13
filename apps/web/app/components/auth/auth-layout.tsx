import * as React from "react";
import { AuthBrandPanel } from "./auth-brand-panel";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-10 bg-background">
      {/* Left panel - Brand content */}
      <AuthBrandPanel />

      {/* Right panel - Form content */}
      <div className="flex items-center bg-neutral-900 justify-center p-6 md:p-12 col-span-4">
        <div className="w-full max-w-[448px]">{children}</div>
      </div>
    </div>
  );
}
