import type { QuestionConfig } from "@repo/form-fields";
import type { UploadQuestionId } from "@repo/upload-contracts";

export type { QuestionConfig };

export type UploadStatus = "complete" | "uploading" | "queued" | "error";

export type UploadItem = {
  id: string;
  questionId: UploadQuestionId;
  fileName: string;
  sizeBytes: number;
  status: UploadStatus;
  progressPct: number;
  errorMessage: string | null;
  uploadSessionId: string | null;
  uploadId: string | null;
  totalParts: number | null;
  completedParts: number;
  isCancelling: boolean;
};

export type ProgressStep = {
  id: string;
  label: string;
  status: "complete" | "current" | "upcoming";
};

export type SectionNavItem = {
  id: string;
  order: number;
  label: string;
};
