import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  variant?: "error" | "success";
  onClose?: () => void;
};

export function Toast({ message, variant = "error", onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isError = variant === "error";

  useEffect(() => {
    setIsVisible(true);

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message, onClose, variant]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 max-w-sm">
      <div
        className={`pointer-events-auto flex items-start gap-2 border px-4 py-3 shadow-lg ${
          isError
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-primary/30 bg-primary/10 text-primary"
        }`}
        role="alert"
        aria-live="polite"
      >
        <span className="material-symbols-outlined text-[16px] leading-[16px]">
          {isError ? "error" : "check_circle"}
        </span>
        <p className="text-[12px] leading-[16px] flex-1">{message}</p>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="text-current/70 hover:text-current transition-colors"
        >
          <span className="material-symbols-outlined text-[16px] leading-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
