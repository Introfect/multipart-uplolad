import { z } from "zod";
import type { Route } from "./+types/dashboard";
import { data, redirect, useNavigation } from "react-router";
import { ContentPanel } from "~/components/dashboard/content-panel";
import { DashboardLayout } from "~/components/dashboard/dashboard-layout";
import { HeroPanel } from "~/components/dashboard/hero-panel";
import { Toast } from "~/components/ui/toast";
import { ROUTE_METADATA } from "~/constants/routes";
import {
  type ApplicationSummary,
  applyToTender,
  fetchApplicationsOverview,
  type TenderSummary,
} from "~/lib/applications.server";
import {
  clearApiKeyCookie,
  fetchMe,
  getApiKeyFromRequest,
  isUserOnboarded,
} from "~/lib/auth.server";

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
      kind: "status";
      label: string;
      status: string;
    }
  | {
      kind: "disabled";
      label: string;
    };

type DashboardTenderView = {
  refNumber: string;
  title: string;
  subtitle: string;
  phase: string;
  location: string;
  coordinates: string;
  countdown: {
    days: string;
    hours: string;
    minutes: string;
  };
  targetDate: string; // ISO string for live timer
  status: string;
  scopeSummary: string;
  mandatoryNotice: {
    title: string;
    description: string;
  };
  primaryAction: DashboardPrimaryAction;
  secondaryAction: string;
};

type DashboardLoaderData = {
  tender: DashboardTenderView;
  error: string | null;
};

type DashboardActionData = {
  success: false;
  error: string;
};

const DashboardCopy = {
  phase: "Phase II — Detailed Design",
  location: "Mumbai, Maharashtra",
  coordinates: "19.0760° N, 72.8777° E",
  scopeSummary:
    "Design and construction of a 45,000 sq. ft. contemporary museum facility incorporating sustainable architecture principles, interactive exhibition spaces, and advanced climate control systems.",
  mandatoryNotice: {
    title: "Mandatory Pre-Qualification",
    description:
      "All participating firms must submit pre-qualification documents before the tender deadline. Late submissions will not be considered.",
  },
  secondaryAction: "Download Requirements",
} as const;

const ApplyActionSchema = z.object({
  intent: z.literal("apply"),
  tenderId: z.string().trim().min(1),
});

function padCounterValue(value: number): string {
  if (value < 10) {
    return `0${value}`;
  }

  return `${value}`;
}

function splitTenderTitle(title: string): {
  title: string;
  subtitle: string;
} {
  const normalized = title.trim();
  if (normalized.length === 0) {
    return { title: "Tender", subtitle: "" };
  }

  const words = normalized.split(/\s+/);
  if (words.length <= 2) {
    return { title: normalized, subtitle: "" };
  }

  const splitIndex = Math.max(words.length - 2, 1);
  return {
    title: words.slice(0, splitIndex).join(" "),
    subtitle: words.slice(splitIndex).join(" "),
  };
}

function buildCountdown({
  lastDateToApplyIso,
  now,
}: {
  lastDateToApplyIso: string;
  now: Date;
}): { days: string; hours: string; minutes: string } {
  const lastDateToApply = new Date(lastDateToApplyIso);
  const diffMs = Math.max(lastDateToApply.getTime() - now.getTime(), 0);

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days: padCounterValue(days),
    hours: padCounterValue(hours),
    minutes: padCounterValue(minutes),
  };
}

function buildTenderView({
  tenderId,
  title,
  lastDateToApply,
  primaryAction,
  status,
  now,
}: {
  tenderId: string;
  title: string;
  lastDateToApply: string;
  primaryAction: DashboardPrimaryAction;
  status: string;
  now: Date;
}): DashboardTenderView {
  const titleParts = splitTenderTitle(title);
  return {
    refNumber: tenderId,
    title: titleParts.title,
    subtitle: titleParts.subtitle,
    phase: DashboardCopy.phase,
    location: DashboardCopy.location,
    coordinates: DashboardCopy.coordinates,
    countdown: buildCountdown({ lastDateToApplyIso: lastDateToApply, now }),
    targetDate: lastDateToApply,
    status,
    scopeSummary: DashboardCopy.scopeSummary,
    mandatoryNotice: {
      title: DashboardCopy.mandatoryNotice.title,
      description: DashboardCopy.mandatoryNotice.description,
    },
    primaryAction,
    secondaryAction: DashboardCopy.secondaryAction,
  };
}

function buildNoTenderView(): DashboardTenderView {
  return {
    refNumber: "N/A",
    title: "No Active",
    subtitle: "Tender",
    phase: DashboardCopy.phase,
    location: DashboardCopy.location,
    coordinates: DashboardCopy.coordinates,
    countdown: {
      days: "00",
      hours: "00",
      minutes: "00",
    },
    targetDate: new Date().toISOString(), // Expired/Now
    status: "No Open Applications",
    scopeSummary: "No active tender is currently available for application.",
    mandatoryNotice: {
      title: "No Active Tender",
      description: "A new tender will appear here once applications are open.",
    },
    primaryAction: {
      kind: "disabled",
      label: "No Tender Available",
    },
    secondaryAction: DashboardCopy.secondaryAction,
  };
}

function getTenderFromApplication({
  application,
  now,
}: {
  application: ApplicationSummary;
  now: Date;
}): DashboardTenderView {
  const isSubmitted = application.status === "submitted";
  const status = isSubmitted
    ? "Application Submitted"
    : "Application In Progress";

  const primaryAction: DashboardPrimaryAction = isSubmitted
    ? {
        kind: "status",
        label: "Submission Status",
        status: "Under Review",
      }
    : {
        kind: "continue",
        label: "Continue Filling",
        href: `/form/${application.applicationId}`,
      };

  return buildTenderView({
    tenderId: application.tenderId,
    title: application.tenderTitle,
    lastDateToApply: application.lastDateToApply,
    primaryAction,
    status,
    now,
  });
}

function getTenderForApply({
  tender,
  now,
}: {
  tender: TenderSummary;
  now: Date;
}): DashboardTenderView {
  return buildTenderView({
    tenderId: tender.tenderId,
    title: tender.title,
    lastDateToApply: tender.lastDateToApply,
    primaryAction: {
      kind: "apply",
      label: "Apply",
      tenderId: tender.tenderId,
    },
    status: "Accepting Applications",
    now,
  });
}

function getDashboardToastError(url: URL): string | null {
  const errorKey = url.searchParams.get("error");
  if (errorKey === "invalid_submission") {
    return "The requested submission was not found for your account.";
  }

  return null;
}

export function meta({}: Route.MetaArgs) {
  const metadata = ROUTE_METADATA.DASHBOARD;
  return [
    { title: `${metadata.title} - MIST` },
    { name: "description", content: metadata.description },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const requestUrl = new URL(request.url);
  const dashboardToastError = getDashboardToastError(requestUrl);

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

  const isAdmin = meResult.data.roles.some((r) => r.roleName === "admin");
  if (isAdmin) {
    throw redirect("/admin");
  }

  const applicationsResult = await fetchApplicationsOverview({
    context,
    apiKey,
  });
  if (!applicationsResult.ok) {
    if (applicationsResult.status === 401) {
      throw redirect("/", {
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      });
    }

    return data<DashboardLoaderData>(
      {
        tender: buildNoTenderView(),
        error: dashboardToastError ?? applicationsResult.error,
      },
      {
        status:
          applicationsResult.status >= 400 ? applicationsResult.status : 500,
      },
    );
  }

  const now = new Date();

  const firstApplication = applicationsResult.data.applications[0];
  if (firstApplication) {
    return {
      tender: getTenderFromApplication({
        application: firstApplication,
        now,
      }),
      error: dashboardToastError,
    };
  }

  const firstTender = applicationsResult.data.tenders[0];
  if (firstTender) {
    return {
      tender: getTenderForApply({
        tender: firstTender,
        now,
      }),
      error: dashboardToastError,
    };
  }

  return {
    tender: buildNoTenderView(),
    error: dashboardToastError,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const apiKey = await getApiKeyFromRequest(request);
  if (!apiKey) {
    throw redirect("/");
  }

  const formData = await request.formData();
  const parsed = ApplyActionSchema.safeParse({
    intent: formData.get("intent"),
    tenderId: formData.get("tenderId"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return data<DashboardActionData>(
      {
        success: false,
        error: issue?.message ?? "Invalid apply request",
      },
      { status: 400 },
    );
  }

  const applyResult = await applyToTender({
    context,
    apiKey,
    tenderId: parsed.data.tenderId,
  });

  if (!applyResult.ok) {
    if (applyResult.status === 401) {
      throw redirect("/", {
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      });
    }

    return data<DashboardActionData>(
      {
        success: false,
        error: applyResult.error,
      },
      { status: applyResult.status >= 400 ? applyResult.status : 400 },
    );
  }

  return redirect(`/form/${applyResult.data.application.applicationId}`);
}

export default function Dashboard({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isApplySubmitting =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === "apply";

  return (
    <>
      {loaderData.error ? (
        <Toast message={loaderData.error} variant="error" />
      ) : null}
      {actionData?.error ? (
        <Toast message={actionData.error} variant="error" />
      ) : null}
      <DashboardLayout heroContent={<HeroPanel tender={loaderData.tender} />}>
        <ContentPanel
          tender={loaderData.tender}
          isApplySubmitting={isApplySubmitting}
        />
      </DashboardLayout>
    </>
  );
}
