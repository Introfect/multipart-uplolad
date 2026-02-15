import { Button } from "~/components/ui/button";

interface SubmissionFooterProps {
  pendingCount: number;
  currentIndex: number;
  totalQuestions: number;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isSubmitted: boolean;
  isReadOnly: boolean;
  isProcessing: boolean;
  canSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function SubmissionFooter({
  pendingCount,
  currentIndex,
  totalQuestions,
  isFirstQuestion,
  isLastQuestion,
  isSubmitted,
  isReadOnly,
  isProcessing,
  canSubmit,
  onPrevious,
  onNext,
  onSubmit,
}: SubmissionFooterProps) {
  const showProcessing = pendingCount > 0 || isProcessing;

  return (
    <footer className="h-24 shrink-0 border-t border-white/5 bg-background/80 backdrop-blur-xl px-8 lg:px-12 flex items-center justify-between z-30">
      {/* Left side - Navigation */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstQuestion || isProcessing}
        >
          <span className="material-symbols-outlined text-[14px]">chevron_left</span>
          Previous
        </Button>
        {!isLastQuestion && (
          <Button
            variant="outline"
            onClick={onNext}
            disabled={isProcessing}
          >
            Next
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </Button>
        )}
      </div>

      {/* Right side - Status + Submit */}
      <div className="flex items-center gap-6">
        {pendingCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest italic">
            {pendingCount} Action{pendingCount > 1 ? "s" : ""} Pending
          </span>
        )}

        {isLastQuestion ? (
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!canSubmit || showProcessing}
            className={showProcessing ? "bg-primary/50 cursor-wait" : ""}
          >
            {showProcessing && (
              <span className="material-symbols-outlined text-lg animate-spin">
                progress_activity
              </span>
            )}
            {isSubmitted
              ? "Submitted"
              : showProcessing
              ? "Processing..."
              : "Submit Application"}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onNext}
            disabled={isProcessing}
          >
            Continue
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Button>
        )}
      </div>
    </footer>
  );
}
