import type { QuestionConfig } from "@repo/form-fields";

export type { QuestionConfig };

export type UploadStatus = "complete" | "uploading" | "queued" | "error";

export type UploadItem = {
  id: string;
  questionId: string;
  fileName: string;
  sizeBytes: number;
  status: UploadStatus;
  progressPct?: number;
  errorMessage?: string;
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
