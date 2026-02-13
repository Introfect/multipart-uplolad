export const UploadQuestionIds = ["q1", "q2", "q3", "q4", "q5"] as const;

export type UploadQuestionId = (typeof UploadQuestionIds)[number];

export const RequiredUploadQuestionIds = ["q1", "q2", "q3", "q5"] as const;

export const UploadAllowedRoleName = "applicant" as const;

export const UploadPartSizeBytes = 8 * 1024 * 1024;
export const UploadMaxParts = 500;
export const UploadSessionTtlMs = 24 * 60 * 60 * 1000;
export const UploadMinFileSizeBytes = 1;
export const UploadMaxFileSizeBytes = UploadPartSizeBytes * UploadMaxParts;
