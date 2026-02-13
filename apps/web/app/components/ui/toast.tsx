type ToastProps = {
  message: string;
  variant?: "error" | "success";
};

export function Toast({ message, variant = "error" }: ToastProps) {
  const isError = variant === "error";

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
        <p className="text-[12px] leading-[16px]">{message}</p>
      </div>
    </div>
  );
}
