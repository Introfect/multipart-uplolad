export {
  UploadChunkUploadConcurrency,
  RequiredUploadQuestionIds,
  UploadMaxFileSizeBytes,
  UploadMaxParts,
  UploadMultipartMinThresholdBytes,
  UploadMinFileSizeBytes,
  UploadPartSizeBytes,
  UploadQuestionIds,
} from "@repo/upload-contracts";

export type { UploadQuestionId } from "@repo/upload-contracts";

export const UploadAllowedRoleName = "applicant" as const;
export const UploadSessionTtlMs = 24 * 60 * 60 * 1000;
