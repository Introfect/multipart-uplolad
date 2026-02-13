import type { AppLoadContext } from "react-router";
import { fetchBackendJson } from "./backend-api.server";

export type UploadQuestionId = "q1" | "q2" | "q3" | "q4" | "q5";

export type InitiatedUploadPart = {
  partNumber: number;
  url: string;
  expiresAt: string;
};

export type UploadStatusSummary = {
  fileId: string;
  questionId: UploadQuestionId;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  uploadedAt: string;
};

export type UploadStatusPayload = {
  tenderId: string;
  submission: {
    status: "draft" | "submitted";
    submittedAt: string | null;
  };
  uploads: Record<UploadQuestionId, UploadStatusSummary | null>;
};

export async function initiateMultipartUpload({
  context,
  apiKey,
  tenderId,
  questionId,
  fileName,
  fileSizeBytes,
  contentType,
}: {
  context: AppLoadContext;
  apiKey: string;
  tenderId: string;
  questionId: UploadQuestionId;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
}) {
  return fetchBackendJson<{
    uploadSessionId: string;
    uploadId: string;
    objectKey: string;
    partSizeBytes: number;
    totalParts: number;
    expiresAt: string;
    parts: InitiatedUploadPart[];
  }>({
    context,
    path: "/api/v1/uploads/initiate",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        tenderId,
        questionId,
        fileName,
        fileSizeBytes,
        contentType,
      }),
    },
  });
}

export async function completeMultipartUploadSession({
  context,
  apiKey,
  tenderId,
  uploadSessionId,
  parts,
}: {
  context: AppLoadContext;
  apiKey: string;
  tenderId: string;
  uploadSessionId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}) {
  return fetchBackendJson<UploadStatusSummary>({
    context,
    path: "/api/v1/uploads/complete",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        tenderId,
        uploadSessionId,
        parts,
      }),
    },
  });
}

export async function abortMultipartUploadSession({
  context,
  apiKey,
  tenderId,
  uploadSessionId,
}: {
  context: AppLoadContext;
  apiKey: string;
  tenderId: string;
  uploadSessionId: string;
}) {
  return fetchBackendJson<{ aborted: true }>({
    context,
    path: "/api/v1/uploads/abort",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        tenderId,
        uploadSessionId,
      }),
    },
  });
}

export async function fetchUploadsStatus({
  context,
  apiKey,
  tenderId,
}: {
  context: AppLoadContext;
  apiKey: string;
  tenderId: string;
}) {
  const params = new URLSearchParams({ tenderId });

  return fetchBackendJson<UploadStatusPayload>({
    context,
    path: `/api/v1/uploads/status?${params.toString()}`,
    init: {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    },
  });
}

export async function submitTenderDocuments({
  context,
  apiKey,
  tenderId,
}: {
  context: AppLoadContext;
  apiKey: string;
  tenderId: string;
}) {
  return fetchBackendJson<{
    tenderId: string;
    status: "submitted";
    submittedAt: string;
  }>({
    context,
    path: "/api/v1/submissions/submit",
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
