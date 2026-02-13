import type { Route } from "./+types/dashboard";
import { redirect } from "react-router";
import { DashboardLayout } from "~/components/dashboard/dashboard-layout";
import { HeroPanel } from "~/components/dashboard/hero-panel";
import { ContentPanel } from "~/components/dashboard/content-panel";
import { ROUTE_METADATA } from "~/constants/routes";
import {
  clearApiKeyCookie,
  fetchMe,
  getApiKeyFromRequest,
  isUserOnboarded,
} from "~/lib/auth.server";

export function meta({ }: Route.MetaArgs) {
  const metadata = ROUTE_METADATA.DASHBOARD;
  return [
    { title: `${metadata.title} - MIST` },
    { name: "description", content: metadata.description },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const apiKey = await getApiKeyFromRequest(request);
  if (!apiKey) {
    throw redirect("/");
  }

  const meResult = await fetchMe({ context, apiKey });
  if (!meResult.ok) {
    throw redirect("/", {
      headers: {
        "Set-Cookie": await clearApiKeyCookie(request),
      },
    });
  }

  if (!isUserOnboarded(meResult.data)) {
    throw redirect("/onboarding");
  }

  return null;
}

const tenderData = {
  refNumber: "MIST-2025-0847",
  title: "India's Largest",
  subtitle: "Tech Museum",
  phase: "Phase II — Detailed Design",
  location: "Mumbai, Maharashtra",
  coordinates: "19.0760° N, 72.8777° E",
  countdown: { days: "14", hours: "06", minutes: "32" },
  status: "Accepting Submissions",
  scopeSummary:
    "Design and construction of a 45,000 sq. ft. contemporary museum facility incorporating sustainable architecture principles, interactive exhibition spaces, and advanced climate control systems.",
  mandatoryNotice: {
    title: "Mandatory Pre-Qualification",
    description:
      "All participating firms must submit pre-qualification documents before the tender deadline. Late submissions will not be considered.",
  },
  primaryAction: "Apply",
  secondaryAction: "Download Requirments",
  progress: [
    { label: "Firm Registration", status: "uploaded" as const, completed: true },
    { label: "Pre-Qualification Documents", status: "uploaded" as const, completed: true },
    { label: "Technical Proposal", status: "pending" as const, completed: false },
    { label: "Financial Bid", status: "waiting" as const, completed: false },
  ],
  progressPercent: 50,
};

export default function Dashboard() {
  return (
    <DashboardLayout heroContent={<HeroPanel tender={tenderData} />}>
      <ContentPanel tender={tenderData} />
    </DashboardLayout>
  );
}
