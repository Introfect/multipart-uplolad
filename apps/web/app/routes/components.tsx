
import type { Route } from "./+types/components"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Separator } from "~/components/ui/separator"
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from "~/components/ui/alert"
import { UploadZone } from "~/components/ui/upload-zone"
import { FileUploadItem } from "~/components/ui/file-upload-item"
import { CountdownTimer } from "~/components/ui/countdown-timer"
import { AsideNav } from "~/components/ui/aside-nav"
import { Header } from "~/components/ui/header"
import { Footer } from "~/components/ui/footer"

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "MIST Design System - Components" },
    { name: "description", content: "Museum of Innovation Science and Technology Component Library" },
  ]
}

export default function ComponentsPage() {
  const navItems = [
    { label: "Design Guidelines", icon: "check_circle", active: true },
    { label: "Brand Identity", badge: 12 },
    { label: "Atomic Components", badge: 24 },
    { label: "Tender Modules", badge: "dot" as const },
  ]

  const breadcrumbs = [
    { label: "Components" },
    { label: "/" },
    { label: "Design-to-Code Reference", active: true },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Aside Navigation */}
      <AsideNav items={navItems} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header
          breadcrumbs={breadcrumbs}
          showSaveStatus
          saveTime="12:04"
          onExport={() => console.log("Export clicked")}
        />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-10">
          <div className="max-w-[896px] space-y-12">
            {/* Title Section */}
            <div className="space-y-0.5">
              <h1 className="text-[48px] font-light leading-[60px] tracking-[-1.2px] text-white">
                Museum of
              </h1>
              <h2 className="font-mono text-[48px] leading-[60px] tracking-[-1.2px] text-primary italic">
                Innovation Science and Technology
              </h2>
            </div>

            {/* Color Palette */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-[7px]">
                <div className="h-12 bg-white" />
                <span className="text-[9px] font-mono leading-[13.5px] text-muted-foreground">
                  #FFFFFF
                </span>
              </div>
              <div className="space-y-[7px]">
                <div className="h-12 bg-primary" />
                <span className="text-[9px] font-mono leading-[13.5px] text-muted-foreground">
                  #D4AF37
                </span>
              </div>
              <div className="space-y-[7px]">
                <div className="h-12 bg-card border border-strong" />
                <span className="text-[9px] font-mono leading-[13.5px] text-muted-foreground">
                  #121212
                </span>
              </div>
              <div className="space-y-[7px]">
                <div className="h-12 bg-background border border-strong" />
                <span className="text-[9px] font-mono leading-[13.5px] text-muted-foreground">
                  #0A0A0A
                </span>
              </div>
            </div>

            {/* Form Atoms Section */}
            <div className="grid grid-cols-2 gap-8">
              <Card variant="elevated" className="p-8 space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-primary">
                  01 // Form Atoms
                </h3>
                <div className="space-y-8">
                  {/* Default Input */}
                  <div className="space-y-2">
                    <Label>Legal Entity Name</Label>
                    <Input defaultValue="Studio Norma Architects" />
                    <span className="text-[10px] uppercase tracking-[0.25px] leading-[15px] text-muted-foreground">
                      Default Input State
                    </span>
                  </div>

                  {/* Error Input */}
                  <div className="space-y-2">
                    <Label>Tax Registration ID</Label>
                    <Input
                      placeholder="Enter ID..."
                      error
                      helperText="Invalid format detected"
                    />
                  </div>
                </div>
              </Card>

              {/* Button System */}
              <Card variant="elevated" className="p-8 space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-primary">
                  02 // Button System
                </h3>
                <div className="space-y-[19px]">
                  <div className="grid grid-cols-2 gap-6">
                    <Button variant="default">Access Portal</Button>
                    <Button variant="primary">Continue</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <Button variant="outline">Secondary Action</Button>
                    <Button variant="ghost">Action Link</Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Upload & Cards Section */}
            <div className="grid grid-cols-2 gap-8">
              {/* Upload Components */}
              <Card variant="elevated" className="p-8 space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-primary">
                  03 // Upload Components
                </h3>
                <div className="space-y-6">
                  <UploadZone />
                  <FileUploadItem
                    filename="Site_Plan_A1.pdf"
                    progress={75}
                    onCancel={() => console.log("Cancel")}
                  />
                </div>
              </Card>

              {/* Cards & Widgets */}
              <Card variant="elevated" className="p-8 space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[3px] leading-[15px] text-primary">
                  04 // Cards & Widgets
                </h3>
                <div className="space-y-6">
                  {/* Alert */}
                  <Alert>
                    <AlertIcon />
                    <AlertContent>
                      <AlertTitle>Mandatory Notice</AlertTitle>
                      <AlertDescription>
                        All architectural submissions must include a valid ISO 9001 certification
                        and lead architect credentials.
                      </AlertDescription>
                    </AlertContent>
                  </Alert>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Tender Card */}
                    <Card className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="live">Live</Badge>
                        <span className="material-symbols-outlined text-[18px] leading-[28px] text-[rgba(255,255,255,0.2)]">
                          more_vert
                        </span>
                      </div>
                      <CardTitle className="!leading-[20px]">
                        MIST Main Atrium Extension
                      </CardTitle>
                      <span className="text-[10px] uppercase tracking-[1px] leading-[15px] text-muted-foreground">
                        Ref: #2024-TDR-09
                      </span>
                    </Card>

                    {/* Countdown Timer */}
                    <CountdownTimer days={12} hours={8} minutes={45} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Footer */}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}
