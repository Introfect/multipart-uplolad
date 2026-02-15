import { Form, Link, useNavigation } from "react-router";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

type DashboardPrimaryAction =
  | {
      kind: "apply";
      label: string;
      tenderId: string;
    }
  | {
      kind: "continue";
      label: string;
      href: string;
    }
  | {
      kind: "disabled";
      label: string;
    }
  | {
      kind: "status";
      label: string;
      status: string;
    };

type ContentPanelProps = {
  tender: {
    refNumber: string;
    status: string;
    scopeSummary: string;
    mandatoryNotice: { title: string; description: string };
    primaryAction: DashboardPrimaryAction;
    secondaryAction: string;
  };
  isApplySubmitting: boolean;
};

function renderPrimaryAction({
  primaryAction,
  isApplySubmitting,
}: {
  primaryAction: DashboardPrimaryAction;
  isApplySubmitting: boolean;
}) {
  const navigation = useNavigation();

  if (primaryAction.kind === "apply") {
    return (
      <Form method="post" className="w-full">
        <input type="hidden" name="intent" value="apply" />
        <input type="hidden" name="tenderId" value={primaryAction.tenderId} />
        <Button
          variant="default"
          className="w-full"
          type="submit"
          disabled={isApplySubmitting}
        >
          {isApplySubmitting ? (
            <span className="flex items-center gap-2">
              <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Applying...
            </span>
          ) : (
            <>
              {primaryAction.label}
              <span className="material-symbols-outlined text-[14px] leading-[14px] ml-auto">
                arrow_forward
              </span>
            </>
          )}
        </Button>
      </Form>
    );
  }

  if (primaryAction.kind === "continue") {
    const isNavigating =
      navigation.state !== "idle" &&
      navigation.location.pathname === primaryAction.href;

    return (
      <Button
        variant="default"
        className="w-full"
        asChild
        disabled={isNavigating}
      >
        <Link to={primaryAction.href}>
          {isNavigating ? (
            <span className="flex items-center gap-2">
              <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Opening...
            </span>
          ) : (
            <>
              {primaryAction.label}
              <span className="material-symbols-outlined text-[14px] leading-[14px] ml-auto">
                arrow_forward
              </span>
            </>
          )}
        </Link>
      </Button>
    );
  }

  if (primaryAction.kind === "status") {
    return (
      <div className="w-full p-3 bg-secondary/50 border border-primary/20 rounded-md flex items-center justify-between">
        <span className="text-[12px] font-medium text-foreground">
          {primaryAction.label}
        </span>
        <Badge variant="live" className="text-primary border-primary/30">
          {primaryAction.status}
        </Badge>
      </div>
    );
  }

  return (
    <Button variant="default" className="w-full" disabled>
      {primaryAction.label}
    </Button>
  );
}

export function ContentPanel({ tender, isApplySubmitting }: ContentPanelProps) {
  return (
    <div className="flex flex-col p-8 relative lg:p-12 min-h-screen">
      <div className="max-w-lg min-h-full mx-auto flex-1 w-full flex flex-col h-full justify-between">
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

        <div>
          <Alert>
            <AlertIcon icon="info" />
            <AlertContent>
              <AlertTitle>{tender.mandatoryNotice.title}</AlertTitle>
              <AlertDescription>
                {tender.mandatoryNotice.description}
              </AlertDescription>
            </AlertContent>
          </Alert>

          <div className="space-y-3 mt-6">
            {renderPrimaryAction({
              primaryAction: tender.primaryAction,
              isApplySubmitting,
            })}
            <Button variant="outline" className="w-full" disabled>
              <span className="material-symbols-outlined text-[14px] leading-[14px]">
                download
              </span>
              {tender.secondaryAction}
            </Button>
          </div>

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
