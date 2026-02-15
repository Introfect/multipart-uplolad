import { useMemo, useRef, useState } from "react";
import { useFormStatePersistence } from "~/hooks/useFormStatePersistence";
import { DateTime } from "luxon";
import { z } from "zod";
import pRetry, { AbortError as RetryAbortError } from "p-retry";
import { redirect, useNavigate } from "react-router";
import { InView } from "react-intersection-observer";
import type { Route } from "./+types/form";
import {
  RequiredUploadQuestionIds,
  UploadChunkUploadConcurrency,
  UploadPartSizeBytes,
  UploadQuestionIds,
  type UploadQuestionId,
} from "@repo/upload-contracts";
import { FORM_QUESTIONS } from "~/constants/form-questions";
import type { QuestionConfig, UploadItem } from "~/types/form";
import { SubmissionShell } from "~/components/submission/submission-shell";
import { PortalSidebar } from "~/components/submission/portal-sidebar";
import { MobileQuestionNavigation } from "~/components/submission/mobile-question-navigation";
import { SubmissionHeader } from "~/components/submission/submission-header";
import { SubmissionFooter } from "~/components/submission/submission-footer";
import { QuestionCard } from "~/components/submission/question-card";
import { Toast } from "~/components/ui/toast";
import {
  clearApiKeyCookie,
  fetchMe,
  getApiKeyFromRequest,
  isUserOnboarded,
} from "~/lib/auth.server";
import { fetchApplicationsOverview } from "~/lib/applications.server";
import {
  fetchUploadsStatus,
  type UploadStatusPayload,
  type UploadStatusSummary,
} from "~/lib/upload.server";
import { getApplicationState } from "~/lib/applicationState.server";
import type { PersistedFormState } from "~/types/persistence.types";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type UploadActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; errorCode?: string };

type UploadQuestionConfig = QuestionConfig & { id: UploadQuestionId };

type ActiveUploadController = {
  abortController: AbortController;
  uploadSessionId: string;
  tenderId: string;
  isCancelled: boolean;
};

type FormLoaderData = {
  submissionId: string;
  tenderId: string;
  tenderTitle: string;
  deadlineLabel: string;
  deadlineIso: string;
  userName: string;
  userEmail: string;
  initialSubmissionStatus: "draft" | "submitted";
  initialUploads: Record<UploadQuestionId, UploadItem | null>;
  initialError: string | null;
  persistedState: PersistedFormState | null;
  apiKey: string;
};

const UploadMutationErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  errorCode: z.string().optional(),
});

const InitiateUploadSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.discriminatedUnion("uploadType", [
    z.object({
      uploadType: z.literal("single"),
      uploadSessionId: z.string(),
      uploadId: z.string(),
      objectKey: z.string(),
      expiresAt: z.string().datetime(),
      url: z.string().url(),
    }),
    z.object({
      uploadType: z.literal("multipart"),
      uploadSessionId: z.string(),
      uploadId: z.string(),
      objectKey: z.string(),
      partSizeBytes: z.number().int(),
      totalParts: z.number().int().positive(),
      expiresAt: z.string().datetime(),
      parts: z
        .array(
          z.object({
            partNumber: z.number().int().positive(),
            url: z.string().url(),
            expiresAt: z.string().datetime(),
          }),
        )
        .min(1),
    }),
  ]),
});

const CompleteUploadSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    fileId: z.string(),
    questionId: z.enum(UploadQuestionIds),
    fileName: z.string(),
    fileSizeBytes: z.number().int(),
    contentType: z.string(),
    uploadedAt: z.string().datetime(),
  }),
});

const AbortUploadSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    aborted: z.literal(true),
  }),
});

const SubmitTenderSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    tenderId: z.string(),
    status: z.literal("submitted"),
    submittedAt: z.string().datetime(),
  }),
});

function isUploadQuestionId(
  questionId: string,
): questionId is UploadQuestionId {
  return (
    questionId === "q1" ||
    questionId === "q2" ||
    questionId === "q3" ||
    questionId === "q4" ||
    questionId === "q5"
  );
}

function isUploadQuestionConfig(
  question: QuestionConfig,
): question is UploadQuestionConfig {
  return isUploadQuestionId(question.id);
}

const UploadQuestions: UploadQuestionConfig[] = FORM_QUESTIONS.filter(
  isUploadQuestionConfig,
);

function createEmptyUploadMap(): Record<UploadQuestionId, UploadItem | null> {
  return {
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
  };
}

function createEmptyControllers(): Record<
  UploadQuestionId,
  ActiveUploadController | null
> {
  return {
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
  };
}

function normalizeUploadErrorMessage(message: string): string {
  const normalized = message.trim();
  if (normalized.length === 0) {
    return "Upload request failed. Please retry.";
  }

  const lowered = normalized.toLowerCase();
  if (
    lowered.includes("domparser") ||
    lowered.includes("deserialization error") ||
    lowered.includes("hidden field") ||
    lowered.includes("$response") ||
    lowered.includes("openssl_internal") ||
    lowered.includes("sslv3_alert_handshake_failure")
  ) {
    return "Upload service is temporarily unavailable. Please retry.";
  }

  return normalized;
}

async function callFormUploadAction<T>({
  payload,
  successSchema,
}: {
  payload: {
    [key: string]: JsonValue;
  };
  successSchema: z.ZodType<{ ok: true; data: T }>;
}): Promise<UploadActionResult<T>> {
  let response: Response;
  try {
    response = await fetch("/form-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return {
      ok: false,
      status: 503,
      error: message,
    };
  }

  let parsedJson: JsonValue;
  try {
    parsedJson = await response.json();
  } catch {
    return {
      ok: false,
      status: response.status,
      error: "Upload request failed (invalid server response).",
    };
  }

  if (!response.ok) {
    const parsedError = UploadMutationErrorSchema.safeParse(parsedJson);
    if (!parsedError.success) {
      return {
        ok: false,
        status: response.status,
        error: `Upload request failed (status ${response.status})`,
      };
    }

    return {
      ok: false,
      status: response.status,
      error: normalizeUploadErrorMessage(parsedError.data.error),
      errorCode: parsedError.data.errorCode,
    };
  }

  const parsedSuccess = successSchema.safeParse(parsedJson);
  if (!parsedSuccess.success) {
    return {
      ok: false,
      status: 500,
      error: "Unexpected upload response shape.",
    };
  }

  return {
    ok: true,
    data: parsedSuccess.data.data,
  };
}

async function requestInitiateUpload({
  tenderId,
  questionId,
  fileName,
  fileSizeBytes,
  contentType,
}: {
  tenderId: string;
  questionId: UploadQuestionId;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
}) {
  return callFormUploadAction({
    payload: {
      intent: "initiate",
      tenderId,
      questionId,
      fileName,
      fileSizeBytes,
      contentType,
    },
    successSchema: InitiateUploadSuccessSchema,
  });
}

async function requestCompleteUpload({
  tenderId,
  uploadSessionId,
  parts,
  etag,
}: {
  tenderId: string;
  uploadSessionId: string;
  parts?: Array<{ partNumber: number; etag: string }>;
  etag?: string;
}) {
  const payload: { [key: string]: JsonValue } = {
    intent: "complete",
    tenderId,
    uploadSessionId,
  };
  if (parts) {
    payload.parts = parts.map((part) => ({
      partNumber: part.partNumber,
      etag: part.etag,
    }));
  }
  if (etag) {
    payload.etag = etag;
  }

  return callFormUploadAction({
    payload,
    successSchema: CompleteUploadSuccessSchema,
  });
}

async function requestAbortUpload({
  tenderId,
  uploadSessionId,
}: {
  tenderId: string;
  uploadSessionId: string;
}) {
  return callFormUploadAction({
    payload: {
      intent: "abort",
      tenderId,
      uploadSessionId,
    },
    successSchema: AbortUploadSuccessSchema,
  });
}

async function requestSubmitTender({ tenderId }: { tenderId: string }) {
  return callFormUploadAction({
    payload: {
      intent: "submit",
      tenderId,
    },
    successSchema: SubmitTenderSuccessSchema,
  });
}

function createUploadingItem({
  questionId,
  file,
}: {
  questionId: UploadQuestionId;
  file: File;
}): UploadItem {
  return {
    id: `${questionId}-${Date.now()}`,
    questionId,
    fileName: file.name,
    sizeBytes: file.size,
    status: "uploading",
    progressPct: 1,
    errorMessage: null,
    uploadSessionId: null,
    uploadId: null,
    totalParts: null,
    completedParts: 0,
    isCancelling: false,
  };
}

function createCompletedItem({
  upload,
}: {
  upload: UploadStatusSummary;
}): UploadItem {
  return {
    id: upload.fileId,
    questionId: upload.questionId,
    fileName: upload.fileName,
    sizeBytes: upload.fileSizeBytes,
    status: "complete",
    progressPct: 100,
    errorMessage: null,
    uploadSessionId: null,
    uploadId: null,
    totalParts: null,
    completedParts: 0,
    isCancelling: false,
  };
}

function toUploadProgress({
  completedParts,
  totalParts,
}: {
  completedParts: number;
  totalParts: number;
}): number {
  if (totalParts <= 0) {
    return 1;
  }

  const scaled = Math.floor((completedParts / totalParts) * 98);
  return Math.min(99, Math.max(1, 1 + scaled));
}

function getErrorMessage(error: Error | RetryAbortError): string {
  if (error instanceof Error) {
    return normalizeUploadErrorMessage(error.message);
  }

  return "Upload failed. Please retry.";
}

function splitFileIntoChunks({
  file,
  partSizeBytes,
}: {
  file: File;
  partSizeBytes: number;
}): Blob[] {
  const chunks: Blob[] = [];
  for (let offset = 0; offset < file.size; offset += partSizeBytes) {
    const end = Math.min(offset + partSizeBytes, file.size);
    chunks.push(file.slice(offset, end));
  }

  return chunks;
}

async function uploadSingleChunkWithRetry({
  url,
  chunk,
  contentType,
  partNumber,
  signal,
}: {
  url: string;
  chunk: Blob;
  contentType: string;
  partNumber: number;
  signal: AbortSignal;
}): Promise<string> {
  return pRetry(
    async () => {
      if (signal.aborted) {
        throw new RetryAbortError("Upload cancelled");
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method: "PUT",
          body: chunk,
          signal,
          headers:
            contentType.trim().length > 0
              ? {
                  "Content-Type": contentType,
                }
              : undefined,
        });
      } catch (error) {
        if (signal.aborted) {
          throw new RetryAbortError("Upload cancelled");
        }

        if (error instanceof Error) {
          throw error;
        }

        throw new Error(`Part ${partNumber} upload failed`);
      }

      if (!response.ok) {
        throw new Error(
          `Part ${partNumber} upload failed with status ${response.status}`,
        );
      }

      const etagHeader = response.headers.get("etag");
      if (!etagHeader) {
        throw new Error(`Part ${partNumber} upload completed without ETag`);
      }

      return etagHeader.replaceAll('"', "");
    },
    {
      retries: 3,
      factor: 2,
      minTimeout: 500,
      maxTimeout: 4000,
      randomize: true,
    },
  );
}

async function uploadChunksWithSlidingWindow({
  parts,
  chunks,
  contentType,
  signal,
  onPartUploaded,
}: {
  parts: Array<{ partNumber: number; url: string }>;
  chunks: Blob[];
  contentType: string;
  signal: AbortSignal;
  onPartUploaded: () => void;
}): Promise<Array<{ partNumber: number; etag: string }>> {
  if (parts.length !== chunks.length) {
    throw new Error("Part metadata count does not match file chunks");
  }

  const uploadedParts: Array<{ partNumber: number; etag: string }> = [];
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      if (signal.aborted) {
        throw new RetryAbortError("Upload cancelled");
      }

      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= parts.length) {
        return;
      }

      const currentPart = parts[currentIndex];
      const currentChunk = chunks[currentIndex];

      const etag = await uploadSingleChunkWithRetry({
        url: currentPart.url,
        chunk: currentChunk,
        contentType,
        partNumber: currentPart.partNumber,
        signal,
      });

      uploadedParts.push({
        partNumber: currentPart.partNumber,
        etag,
      });

      onPartUploaded();
    }
  };

  const workerCount = Math.min(UploadChunkUploadConcurrency, parts.length);
  const workers: Promise<void>[] = [];
  for (let index = 0; index < workerCount; index += 1) {
    workers.push(worker());
  }

  await Promise.all(workers);
  uploadedParts.sort((left, right) => left.partNumber - right.partNumber);
  return uploadedParts;
}

function formatDeadlineLabel(isoDate: string): string {
  return DateTime.fromISO(isoDate)
    .setZone("local")
    .toLocaleString(DateTime.DATETIME_FULL);
}

function mapStatusUploadsToItems(
  uploads: UploadStatusPayload["uploads"],
): Record<UploadQuestionId, UploadItem | null> {
  const mapped = createEmptyUploadMap();
  for (const questionId of UploadQuestionIds) {
    const upload = uploads[questionId];
    mapped[questionId] = upload ? createCompletedItem({ upload }) : null;
  }

  return mapped;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Tender Submission - MIST" },
    { name: "description", content: "Submit your tender documents" },
  ];
}

export async function loader({
  request,
  context,
  params,
}: Route.LoaderArgs): Promise<FormLoaderData> {
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

  // Admins cannot access forms
  const isAdmin = meResult.data.roles.some((role) => role.roleName === "admin");
  if (isAdmin) {
    throw redirect("/admin");
  }

  // Check onboarding status
  if (!isUserOnboarded(meResult.data)) {
    throw redirect("/onboarding");
  }

  const submissionId = params.submissionId?.trim() ?? "";
  if (submissionId.length === 0) {
    throw redirect("/dashboard?error=invalid_submission");
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

    throw redirect("/dashboard?error=invalid_submission");
  }

  const application = applicationsResult.data.applications.find(
    (candidate) => candidate.applicationId === submissionId,
  );

  if (!application) {
    throw redirect("/dashboard?error=invalid_submission");
  }

  const now = new Date();
  const firstDate = new Date(application.firstDateToApply);
  const lastDate = new Date(application.lastDateToApply);

  if (application.status === "submitted") {
    throw redirect("/dashboard");
  }

  if (now < firstDate) {
    throw redirect("/dashboard?error=early_access");
  }

  if (now > lastDate) {
    throw redirect("/dashboard?error=late_submission");
  }

  let initialUploads = createEmptyUploadMap();
  let initialSubmissionStatus: "draft" | "submitted" = application.status;
  let initialError: string | null = null;

  const statusResult = await fetchUploadsStatus({
    context,
    apiKey,
    tenderId: application.tenderId,
  });

  if (!statusResult.ok) {
    if (statusResult.status === 401) {
      throw redirect("/", {
        headers: {
          "Set-Cookie": await clearApiKeyCookie(request),
        },
      });
    }

    initialError = normalizeUploadErrorMessage(statusResult.error);
  } else {
    initialSubmissionStatus = statusResult.data.submission.status;
    initialUploads = mapStatusUploadsToItems(statusResult.data.uploads);
  }

  // Fetch persisted form state
  const persistedStateResult = await getApplicationState({
    context,
    apiKey,
    submissionId,
  });

  const persistedState = persistedStateResult.ok
    ? persistedStateResult.data
    : null;

  // Reconcile: if persisted state exists, it is the source of truth for which
  // files the user wants to keep. A file present in uploaded_file but absent
  // from persisted state means the user explicitly removed it.
  if (persistedState) {
    for (const questionId of UploadQuestionIds) {
      const uploadedFile = initialUploads[questionId];
      if (!uploadedFile) continue;

      const inPersistedSingle = persistedState.singleUploads[questionId];
      if (!inPersistedSingle) {
        // User removed this file — hide it on load
        initialUploads[questionId] = null;
      }
    }
  }

  return {
    submissionId,
    tenderId: application.tenderId,
    tenderTitle: application.tenderTitle,
    deadlineLabel: formatDeadlineLabel(application.lastDateToApply),
    deadlineIso: application.lastDateToApply,
    userName: meResult.data.name || meResult.data.email,
    userEmail: meResult.data.email,
    initialSubmissionStatus,
    initialUploads,
    initialError,
    persistedState,
    apiKey,
  };
}

export default function FormPage({ loaderData }: Route.ComponentProps) {
  const [uploads, setUploads] = useState<
    Record<UploadQuestionId, UploadItem | null>
  >(loaderData.initialUploads);
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const firstIncompleteIndex = UploadQuestions.findIndex((question) => {
      const upload = loaderData.initialUploads[question.id];
      return upload === null || upload.status !== "complete";
    });

    return firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
  });
  const navigate = useNavigate();
  const [submissionStatus, setSubmissionStatus] = useState<
    "draft" | "submitted"
  >(loaderData.initialSubmissionStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "error" | "success";
  } | null>(
    loaderData.initialError
      ? {
          message: loaderData.initialError,
          variant: "error",
        }
      : null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeControllersRef = useRef<
    Record<UploadQuestionId, ActiveUploadController | null>
  >(createEmptyControllers());
  const isProgrammaticScrollRef = useRef(false);

  // Form state persistence with XState
  const {
    state: persistedFormState,
    send: sendToPersistence,
    isDirty,
  } = useFormStatePersistence({
    submissionId: loaderData.submissionId,
    apiKey: loaderData.apiKey,
    initialState: loaderData.persistedState,
  });

  const pendingCount = useMemo(() => {
    let count = 0;
    for (const questionId of UploadQuestionIds) {
      const upload = uploads[questionId];
      if (!upload) {
        continue;
      }

      if (
        upload.status === "uploading" ||
        upload.status === "queued" ||
        upload.isCancelling
      ) {
        count += 1;
      }
    }

    return count;
  }, [uploads]);

  const missingRequiredUploads = useMemo(() => {
    const missing: UploadQuestionId[] = [];
    for (const requiredId of RequiredUploadQuestionIds) {
      const upload = uploads[requiredId];
      if (!upload || upload.status !== "complete") {
        missing.push(requiredId);
      }
    }

    return missing;
  }, [uploads]);

  const isReadOnly = submissionStatus === "submitted";
  const activeQuestion = UploadQuestions[activeIndex];

  const updateUpload = ({
    questionId,
    updater,
  }: {
    questionId: UploadQuestionId;
    updater: (current: UploadItem | null) => UploadItem | null;
  }) => {
    setUploads((previous) => ({
      ...previous,
      [questionId]: updater(previous[questionId]),
    }));
  };

  const redirectToLogin = () => {
    window.location.assign("/");
  };

  const goToIndex = (index: number) => {
    if (index < 0 || index >= UploadQuestions.length) {
      return;
    }

    isProgrammaticScrollRef.current = true;
    setActiveIndex(index);

    const targetQuestion = UploadQuestions[index];
    const container = scrollRef.current;
    const element = document.getElementById(targetQuestion.id);

    if (container && element) {
      // Calculate offset relative to the container for accurate scrolling
      // We subtract the container's offsetTop to get the relative position
      // However, since the container is fixed/flex-1, simple offsetTop of the child
      // within the scrollable parent usually works if the parent is positioned.
      // Let's rely on basic offsetTop for now as the section is a direct child of the scroll container.
      container.scrollTo({
        top: element.offsetTop,
        behavior: "smooth",
      });
    }

    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 600);
  };

  const goToPrev = () => {
    if (activeIndex > 0) {
      goToIndex(activeIndex - 1);
    }
  };

  const goToNext = () => {
    if (activeIndex < UploadQuestions.length - 1) {
      goToIndex(activeIndex + 1);
    }
  };

  const handleQuestionSelect = (questionId: UploadQuestionId) => {
    const targetIndex = UploadQuestions.findIndex((q) => q.id === questionId);
    if (targetIndex >= 0) {
      goToIndex(targetIndex);
    }
  };

  const handleStartUpload = async ({
    question,
    file,
  }: {
    question: UploadQuestionConfig;
    file: File;
  }) => {
    if (isReadOnly) {
      return;
    }

    if (file.size > question.maxSizeMB * 1024 * 1024) {
      updateUpload({
        questionId: question.id,
        updater: () => ({
          ...createUploadingItem({ questionId: question.id, file }),
          status: "error",
          progressPct: 0,
          errorMessage: `File exceeds ${question.maxSizeMB}MB limit`,
        }),
      });
      return;
    }

    setToast(null);

    updateUpload({
      questionId: question.id,
      updater: () => createUploadingItem({ questionId: question.id, file }),
    });

    const initiateResult = await requestInitiateUpload({
      tenderId: loaderData.tenderId,
      questionId: question.id,
      fileName: file.name,
      fileSizeBytes: file.size,
      contentType: file.type || "application/octet-stream",
    });

    if (!initiateResult.ok) {
      if (initiateResult.status === 401) {
        redirectToLogin();
        return;
      }

      updateUpload({
        questionId: question.id,
        updater: (current) => {
          if (!current) {
            return null;
          }

          return {
            ...current,
            status: "error",
            progressPct: 0,
            errorMessage: initiateResult.error,
          };
        },
      });
      setToast({ message: initiateResult.error, variant: "error" });
      return;
    }

    const controller: ActiveUploadController = {
      abortController: new AbortController(),
      uploadSessionId: initiateResult.data.uploadSessionId,
      tenderId: loaderData.tenderId,
      isCancelled: false,
    };

    activeControllersRef.current[question.id] = controller;

    updateUpload({
      questionId: question.id,
      updater: (current) => {
        if (!current) {
          return null;
        }

        return {
          ...current,
          uploadSessionId: initiateResult.data.uploadSessionId,
          uploadId: initiateResult.data.uploadId,
          totalParts:
            initiateResult.data.uploadType === "multipart"
              ? initiateResult.data.totalParts
              : 1,
          completedParts: 0,
          progressPct: 1,
        };
      },
    });

    try {
      if (initiateResult.data.uploadType === "single") {
        const uploadedEtag = await uploadSingleChunkWithRetry({
          url: initiateResult.data.url,
          chunk: file,
          contentType: file.type || "application/octet-stream",
          partNumber: 1,
          signal: controller.abortController.signal,
        });

        if (
          controller.isCancelled ||
          controller.abortController.signal.aborted
        ) {
          return;
        }

        updateUpload({
          questionId: question.id,
          updater: (current) => {
            if (!current) {
              return null;
            }

            return {
              ...current,
              completedParts: 1,
              progressPct: 99,
            };
          },
        });

        const completeResult = await requestCompleteUpload({
          tenderId: loaderData.tenderId,
          uploadSessionId: initiateResult.data.uploadSessionId,
          etag: uploadedEtag,
        });

        if (!completeResult.ok) {
          if (completeResult.status === 401) {
            redirectToLogin();
            return;
          }

          updateUpload({
            questionId: question.id,
            updater: (current) => {
              if (!current) {
                return null;
              }

              return {
                ...current,
                status: "error",
                errorMessage: completeResult.error,
              };
            },
          });
          setToast({ message: completeResult.error, variant: "error" });
          return;
        }

        updateUpload({
          questionId: question.id,
          updater: () => ({
            id: completeResult.data.fileId,
            questionId: completeResult.data.questionId,
            fileName: completeResult.data.fileName,
            sizeBytes: completeResult.data.fileSizeBytes,
            status: "complete",
            progressPct: 100,
            errorMessage: null,
            uploadSessionId: null,
            uploadId: null,
            totalParts: null,
            completedParts: 0,
            isCancelling: false,
          }),
        });

        // Persist completed upload to backend
        sendToPersistence({
          type: "ADD_SINGLE_UPLOAD",
          fieldId: question.id,
          upload: {
            fileId: completeResult.data.fileId,
            fileName: completeResult.data.fileName,
            fileSize: completeResult.data.fileSizeBytes,
            mimeType: completeResult.data.contentType,
            completedAt: new Date().toISOString(),
          },
        });

        return;
      }

      if (initiateResult.data.partSizeBytes !== UploadPartSizeBytes) {
        updateUpload({
          questionId: question.id,
          updater: (current) => {
            if (!current) {
              return null;
            }

            return {
              ...current,
              status: "error",
              progressPct: 0,
              errorMessage:
                "Upload chunk size mismatch. Please refresh and retry.",
            };
          },
        });
        return;
      }

      const chunks = splitFileIntoChunks({
        file,
        partSizeBytes: UploadPartSizeBytes,
      });

      const sortedParts = [...initiateResult.data.parts].sort(
        (left, right) => left.partNumber - right.partNumber,
      );

      if (
        chunks.length !== sortedParts.length ||
        chunks.length !== initiateResult.data.totalParts
      ) {
        updateUpload({
          questionId: question.id,
          updater: (current) => {
            if (!current) {
              return null;
            }

            return {
              ...current,
              status: "error",
              progressPct: 0,
              errorMessage: "Part count mismatch. Please retry.",
            };
          },
        });
        return;
      }

      const completedParts = await uploadChunksWithSlidingWindow({
        parts: sortedParts.map((part) => ({
          partNumber: part.partNumber,
          url: part.url,
        })),
        chunks,
        contentType: file.type,
        signal: controller.abortController.signal,
        onPartUploaded: () => {
          updateUpload({
            questionId: question.id,
            updater: (current) => {
              if (!current || current.totalParts === null) {
                return current;
              }

              const completedCount = Math.min(
                current.totalParts,
                current.completedParts + 1,
              );

              return {
                ...current,
                completedParts: completedCount,
                progressPct: toUploadProgress({
                  completedParts: completedCount,
                  totalParts: current.totalParts,
                }),
              };
            },
          });
        },
      });

      if (controller.isCancelled || controller.abortController.signal.aborted) {
        return;
      }

      updateUpload({
        questionId: question.id,
        updater: (current) => {
          if (!current) {
            return null;
          }

          return {
            ...current,
            progressPct: 99,
          };
        },
      });

      const completeResult = await requestCompleteUpload({
        tenderId: loaderData.tenderId,
        uploadSessionId: initiateResult.data.uploadSessionId,
        parts: completedParts,
      });

      if (!completeResult.ok) {
        if (completeResult.status === 401) {
          redirectToLogin();
          return;
        }

        updateUpload({
          questionId: question.id,
          updater: (current) => {
            if (!current) {
              return null;
            }

            return {
              ...current,
              status: "error",
              errorMessage: completeResult.error,
            };
          },
        });
        setToast({ message: completeResult.error, variant: "error" });
        return;
      }

      updateUpload({
        questionId: question.id,
        updater: () => ({
          id: completeResult.data.fileId,
          questionId: completeResult.data.questionId,
          fileName: completeResult.data.fileName,
          sizeBytes: completeResult.data.fileSizeBytes,
          status: "complete",
          progressPct: 100,
          errorMessage: null,
          uploadSessionId: null,
          uploadId: null,
          totalParts: null,
          completedParts: 0,
          isCancelling: false,
        }),
      });

      // Persist completed upload to backend
      sendToPersistence({
        type: "ADD_SINGLE_UPLOAD",
        fieldId: question.id,
        upload: {
          fileId: completeResult.data.fileId,
          fileName: completeResult.data.fileName,
          fileSize: completeResult.data.fileSizeBytes,
          mimeType: completeResult.data.contentType,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (
        controller.isCancelled ||
        controller.abortController.signal.aborted ||
        error instanceof RetryAbortError
      ) {
        return;
      }

      updateUpload({
        questionId: question.id,
        updater: (current) => {
          if (!current) {
            return null;
          }

          return {
            ...current,
            status: "error",
            errorMessage: getErrorMessage(
              error instanceof Error ? error : new Error("Upload failed"),
            ),
          };
        },
      });
      setToast({
        message: getErrorMessage(
          error instanceof Error
            ? error
            : new Error("Upload failed. Please try again."),
        ),
        variant: "error",
      });
    } finally {
      if (activeControllersRef.current[question.id] === controller) {
        activeControllersRef.current[question.id] = null;
      }
    }
  };

  const handleCancelUpload = async (questionId: UploadQuestionId) => {
    const controller = activeControllersRef.current[questionId];
    if (!controller) {
      updateUpload({
        questionId,
        updater: () => null,
      });
      return;
    }

    controller.isCancelled = true;
    controller.abortController.abort();

    updateUpload({
      questionId,
      updater: (current) => {
        if (!current) {
          return null;
        }

        return {
          ...current,
          isCancelling: true,
        };
      },
    });

    const abortResult = await requestAbortUpload({
      tenderId: controller.tenderId,
      uploadSessionId: controller.uploadSessionId,
    });

    if (!abortResult.ok && abortResult.status === 401) {
      redirectToLogin();
      return;
    }

    activeControllersRef.current[questionId] = null;

    updateUpload({
      questionId,
      updater: () => null,
    });
  };

  const handleDeleteUpload = (questionId: UploadQuestionId) => {
    if (isReadOnly) {
      return;
    }

    // Check if this was a persisted upload before clearing
    const currentUpload = uploads[questionId];
    const wasCompleted = currentUpload?.status === "complete";

    updateUpload({
      questionId,
      updater: () => null,
    });

    // Remove from persisted state if it was completed
    if (wasCompleted) {
      sendToPersistence({
        type: "REMOVE_SINGLE_UPLOAD",
        fieldId: questionId,
      });
    }
  };

  const handleRetryUpload = (questionId: UploadQuestionId) => {
    if (isReadOnly) {
      return;
    }

    setToast(null);
    updateUpload({
      questionId,
      updater: (current) => {
        if (!current) {
          return null;
        }

        return {
          ...current,
          errorMessage: null,
        };
      },
    });
  };

  const handleSaveDraft = () => {
    setToast({
      message: "Draft is saved automatically as you upload files.",
      variant: "success",
    });
  };

  const handleSubmitApplication = async () => {
    if (
      isReadOnly ||
      isSubmitting ||
      pendingCount > 0 ||
      missingRequiredUploads.length > 0
    ) {
      return;
    }

    setIsSubmitting(true);

    const submitResult = await requestSubmitTender({
      tenderId: loaderData.tenderId,
    });

    setIsSubmitting(false);

    if (!submitResult.ok) {
      if (submitResult.status === 401) {
        redirectToLogin();
        return;
      }

      setToast({
        message: submitResult.error,
        variant: "error",
      });
      return;
    }

    setSubmissionStatus("submitted");
    navigate(`/form/${loaderData.submissionId}/success`);
  };

  return (
    <>
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => {
            setToast(null);
          }}
        />
      ) : null}

      <SubmissionShell
        sidebar={
          <PortalSidebar
            questions={UploadQuestions}
            activeId={activeQuestion.id}
            onSelect={handleQuestionSelect}
            uploads={uploads}
            deadlineIso={loaderData.deadlineIso}
            userName={loaderData.userName}
            userEmail={loaderData.userEmail}
          />
        }
      >
        <MobileQuestionNavigation
          questions={UploadQuestions}
          activeId={activeQuestion.id}
          onSelect={handleQuestionSelect}
          uploads={uploads}
          deadlineLabel={loaderData.deadlineLabel}
        />

        <SubmissionHeader
          title="Technical Submission —"
          highlight={loaderData.tenderId}
          subtitle={loaderData.tenderTitle}
          deadlineLabel={loaderData.deadlineLabel}
        />

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-none snap-y snap-mandatory no-scrollbar bg-[radial-gradient(circle_at_top,rgba(255,196,0,0.06),rgba(0,0,0,0)_45%)]"
        >
          {UploadQuestions.map((question, index) => (
            <InView
              key={question.id}
              root={scrollRef.current}
              threshold={0.5}
              onChange={(inView) => {
                if (inView && !isProgrammaticScrollRef.current) {
                  setActiveIndex(index);
                }
              }}
            >
              {({ ref }) => (
                <section
                  ref={ref}
                  id={question.id}
                  className="h-full shrink-0 snap-start flex items-start px-6 py-10 md:px-12 md:py-16 lg:px-20"
                >
                  <div className="w-full max-w-2xl mx-auto">
                    <QuestionCard
                      question={question}
                      upload={uploads[question.id]}
                      totalQuestions={UploadQuestions.length}
                      isReadOnly={isReadOnly}
                      onAddFile={(file) => {
                        void handleStartUpload({
                          question,
                          file,
                        });
                      }}
                      onCancel={() => {
                        void handleCancelUpload(question.id);
                      }}
                      onDelete={() => {
                        handleDeleteUpload(question.id);
                      }}
                      onRetry={() => {
                        handleRetryUpload(question.id);
                      }}
                    />
                  </div>
                </section>
              )}
            </InView>
          ))}
        </div>

        <SubmissionFooter
          pendingCount={pendingCount}
          currentIndex={activeIndex}
          totalQuestions={UploadQuestions.length}
          isFirstQuestion={activeIndex === 0}
          isLastQuestion={activeIndex === UploadQuestions.length - 1}
          isSubmitted={submissionStatus === "submitted"}
          isReadOnly={isReadOnly}
          isProcessing={isSubmitting}
          canSubmit={
            !isSubmitting &&
            submissionStatus !== "submitted" &&
            pendingCount === 0 &&
            missingRequiredUploads.length === 0
          }
          onPrevious={goToPrev}
          onNext={goToNext}
          onSubmit={handleSubmitApplication}
        />
      </SubmissionShell>
    </>
  );
}
