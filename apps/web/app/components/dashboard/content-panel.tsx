import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertIcon, AlertContent, AlertTitle, AlertDescription } from "~/components/ui/alert";

interface ProgressItem {
  label: string;
  status: "uploaded" | "pending" | "waiting";
  completed: boolean;
}

interface ContentPanelProps {
  tender: {
    refNumber: string;
    status: string;
    scopeSummary: string;
    mandatoryNotice: { title: string; description: string };
    primaryAction: string;
    secondaryAction: string;
    progress: ProgressItem[];
    progressPercent: number;
  };
}

const statusColors: Record<string, string> = {
  uploaded: "text-success",
  pending: "text-primary",
  waiting: "text-muted-foreground",
};

export function ContentPanel({ tender }: ContentPanelProps) {
  return (
    <div className="flex flex-col p-8  relative lg:p-12 min-h-screen">
      <div className="max-w-lg min-h-full  mx-auto flex-1 w-full flex flex-col h-full  justify-between ">
        {/* Mobile brand header */}
        <div>

          <div className="flex items-center gap-3 lg:hidden">
            <div className="size-8 bg-foreground flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px] leading-[16px] text-background">
                museum
              </span>
            </div>
            <span className="text-[12px] font-bold uppercase tracking-[2px] leading-[16px] text-foreground">
              MIST
            </span>
          </div>
          {/* Tender meta */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[2px] leading-[15px] text-muted-foreground">
                Reference ID
              </span>
              <span className="font-mono text-[11px] leading-[16px] text-foreground">
                {tender.refNumber}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[2px] leading-[15px] text-muted-foreground">
                Status
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="dot" />
                <span className="text-[11px] leading-[16px] text-primary font-medium">
                  {tender.status}
                </span>
              </div>
            </div>
            <Separator />
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[2px] leading-[15px] text-primary">
              Scope Summary
            </h3>
            <p className="font-mono text-[15px] leading-[22px] text-muted-foreground italic">
              {tender.scopeSummary}
            </p>
          </div>
        </div>
        {/* Scope summary */}
        <div>


          <Alert>
            <AlertIcon icon="info" />
            <AlertContent className="">
              <AlertTitle>{tender.mandatoryNotice.title}</AlertTitle>
              <AlertDescription>{tender.mandatoryNotice.description}</AlertDescription>
            </AlertContent>
          </Alert>

          {/* Action buttons */}
          <div className="space-y-3 mt-6">
            <Button variant="default" className="w-full">
              {tender.primaryAction}
              <span className="material-symbols-outlined text-[14px] leading-[14px] ml-auto">
                arrow_forward
              </span>
            </Button>
            <Button variant="outline" className="w-full">
              <span className="material-symbols-outlined text-[14px] leading-[14px]">
                download
              </span>
              {tender.secondaryAction}
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-auto sticky bottom-0 pt-8">
            <Separator />
            <div className="flex items-center justify-center gap-6 pt-6">
              {["Support", "Legal Policy", "Privacy"].map((link) => (
                <button
                  key={link}
                  className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
