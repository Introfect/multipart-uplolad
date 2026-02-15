export const UploadQuestionIds = ["q1", "q2", "q3", "q4", "q5"] as const;

export type UploadQuestionId = (typeof UploadQuestionIds)[number];

export const RequiredUploadQuestionIds = ["q1", "q2", "q3", "q5"] as const;

export const UploadMultipartMinThresholdBytes = 5 * 1024 * 1024;
export const UploadPartSizeBytes = 10 * 1024 * 1024;
export const UploadChunkUploadConcurrency = 5;
export const UploadMaxParts = 500;
export const UploadMinFileSizeBytes = 1;
export const UploadMaxFileSizeBytes = UploadPartSizeBytes * UploadMaxParts;
