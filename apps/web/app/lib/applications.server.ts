import type { AppLoadContext } from "react-router";
import { fetchBackendJson } from "./backend-api.server";

export type ApplicationSummary = {
  applicationId: string;
  tenderId: string;
  tenderTitle: string;
  status: "draft" | "submitted";
  submittedAt: string | null;
  createdAt: string;
  createdBy: string;
  firstDateToApply: string;
  lastDateToApply: string;
};

export type TenderSummary = {
  tenderId: string;
  title: string;
  firstDateToApply: string;
  lastDateToApply: string;
};

export type ApplicationsOverviewPayload = {
  applications: ApplicationSummary[];
  tenders: TenderSummary[];
};

export async function fetchApplicationsOverview({
  context,
  apiKey,
}: {
  context: AppLoadContext;
  apiKey: string;
}) {
  return fetchBackendJson<ApplicationsOverviewPayload>({
    context,
    path: "/api/v1/applications",
    init: {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    },
  });
}

export async function applyToTender({
  context,
  apiKey,
  tenderId,
}: {
  context: AppLoadContext;
  apiKey: string;
  tenderId: string;
}) {
  return fetchBackendJson<{ application: ApplicationSummary }>({
    context,
    path: "/api/v1/applications/apply",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ tenderId }),
    },
  });
}

export type SubmissionDetail = {
  applicationId: string;
  applicantEmail: string;
  applicantFirmName: string | null;
  applicantName: string | null;
  applicantPhoneNumber: string | null;
  submittedAt: string;
  status: "submitted";
  r2FolderUrl: string;
};

export async function fetchAllSubmissions({
  context,
  apiKey,
}: {
  context: AppLoadContext;
  apiKey: string;
}) {
  return fetchBackendJson<{ applications: SubmissionDetail[] }>({
    context,
    path: "/api/v1/admin/applications/submitted",
    init: {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    },
  });
}
