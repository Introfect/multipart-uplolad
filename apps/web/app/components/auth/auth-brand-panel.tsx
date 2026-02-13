import { Badge } from "~/components/ui/badge";

const features = [
  {
    number: "01",
    title: "CURATION",
    description: "Curated selection of institutional architecture projects",
  },
  {
    number: "02",
    title: "STRATEGY",
    description: "Strategic tender management and submission tracking",
  },
  {
    number: "03",
    title: "NETWORK",
    description: "Global network of verified architectural professionals",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="hidden md:flex flex-col p-20 bg-card relative overflow-hidden col-span-6">
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        <img
          src="/login-layout/Modern Architectural Museum Concrete.svg"
          alt=""
          className="size-full object-contain opacity-70"
        />
      </div>
      <div className="absolute inset-0 z-1">
        <img
          src="/login-layout/Overlay.png"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 z-2">
        <img
          src="/login-layout/Gradient.svg"
          alt=""
          className="w-full h-full object-covber"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="size-12 bg-foreground flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px] leading-[24px] text-background">
              architecture
            </span>
          </div>
          <span className="text-[14px] font-medium leading-[20px] text-foreground">
            Mist Tender
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-0.5 mb-8">
          <h1 className="text-[60px] font-light leading-[60px] tracking-[-1.5px] text-foreground">
            Museum of
          </h1>
          <h2 className="font-mono text-[60px] leading-[60px] tracking-[-1.5px] text-primary italic">
            Innovation Science and Technology
          </h2>
        </div>

        {/* Badge */}
        <div className="mb-8">
          <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
            Institutional Architecture
          </Badge>
        </div>

        {/* Description */}
        <p className="text-[14px] leading-[20px] text-muted-foreground mb-12">
          Secure access to the global repository for museum design competitions and architectural tenders.
        </p>

        {/* Features */}
        <div className="mt-auto grid grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.number} className="space-y-2">
              <div className="size-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold leading-[15px] text-background">
                  {feature.number}
                </span>
              </div>
              <h3 className="text-[12px] font-bold leading-[16px] text-foreground uppercase tracking-[1px]">
                {feature.title}
              </h3>
              <p className="text-[10px] leading-[15px] text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
