import { Badge } from "~/components/ui/badge";

interface CountdownItemProps {
  value: string;
  label: string;
}

function CountdownItem({ value, label }: CountdownItemProps) {
  return (
    <div className="text-center">
      <div className="font-mono text-[48px] leading-[48px] text-foreground">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-primary mt-2">
        {label}
      </div>
    </div>
  );
}

interface HeroPanelProps {
  tender: {
    refNumber: string;
    title: string;
    subtitle: string;
    phase: string;
    location: string;
    coordinates: string;
    countdown: { days: string; hours: string; minutes: string };
  };
}

export function HeroPanel({ tender }: HeroPanelProps) {
  return (
    <div className="flex flex-col w-full h-full bg-card relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        <img
          src="/login-layout/Modern Architectural Museum Concrete.svg"
          alt=""
          className="size-full object-cover opacity-70"
        />
      </div>
      <div className="absolute inset-0 z-1">
        <img src="/login-layout/Overlay.png" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 z-2">
        <img src="/login-layout/Gradient.svg" alt="" className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-auto">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-foreground flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] leading-[20px] text-background">
                museum
              </span>
            </div>
            <span className="text-[14px] font-medium leading-[20px] text-foreground">
              MIST Tender
            </span>
          </div>
          <span className="font-mono text-[11px] leading-[16px] text-muted-foreground tracking-wider">
            {tender.refNumber}
          </span>
        </div>

        {/* Hero block — centered */}
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-8">
          <Badge variant="live">Active Project</Badge>

          <h1 className="font-mono text-[64px] font-medium leading-snug tracking-[-0.5px] text-foreground italic max-w-[500px]">
            {tender.title} <span className="text-primary">{tender.subtitle}</span>
          </h1>

          {/* Countdown */}
          <div className="flex items-center gap-12">
            <CountdownItem value={tender.countdown.days} label="Days" />
            <div className="text-[32px] text-muted-foreground font-light">:</div>
            <CountdownItem value={tender.countdown.hours} label="Hours" />
            <div className="text-[32px] text-muted-foreground font-light">:</div>
            <CountdownItem value={tender.countdown.minutes} label="Minutes" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-end justify-between mt-auto">
          <div className="flex gap-12">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-muted-foreground mb-1">
                Phase
              </div>
              <div className="text-[14px] leading-[20px] text-foreground">{tender.phase}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[2px] leading-[13.5px] text-muted-foreground mb-1">
                Location
              </div>
              <div className="text-[14px] leading-[20px] text-foreground">{tender.location}</div>
            </div>
          </div>
          <span className="font-mono text-[10px] leading-[15px] text-muted-foreground">
            {tender.coordinates}
          </span>
        </div>
      </div>
    </div>
  );
}
