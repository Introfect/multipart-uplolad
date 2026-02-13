import { Button } from "~/components/ui/button";

interface SubmissionFooterProps {
  pendingCount: number;
  primaryLabel: string;
  onSaveDraft: () => void;
  onPrimary: () => void;
  isProcessing?: boolean;
}

export function SubmissionFooter({
  pendingCount,
  primaryLabel,
  onSaveDraft,
  onPrimary,
  isProcessing,
}: SubmissionFooterProps) {
  return (
    <div className="h-24 shrink-0 border-t border-subtle backdrop-blur-mist bg-[rgba(10,10,10,0.5)] flex items-center justify-between px-8 lg:px-12">
      <Button variant="outline" onClick={onSaveDraft}>
        Save Draft
      </Button>
      <div className="flex items-center gap-4">
        {pendingCount > 0 && (
          <span className="font-mono text-[11px] leading-[16px] text-muted-foreground italic">
            {pendingCount} pending upload{pendingCount > 1 ? "s" : ""}
          </span>
        )}
        <Button variant="primary" onClick={onPrimary} disabled={isProcessing}>
          {isProcessing && (
            <span className="material-symbols-outlined text-[14px] leading-[14px] animate-spin">
              sync
            </span>
          )}
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
