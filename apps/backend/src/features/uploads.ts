import { and, eq, inArray } from "drizzle-orm";
import { WithDb, WithDbAndEnv } from "../utils/commonTypes";
import { ErrorCodes } from "../utils/error";
import {
  SubmissionStatuses,
  SubmissionTable,
  TenderTable,
  UploadedFileTable,
  UploadSessionStatuses,
  UploadSessionTable,
} from "./db/schema";
import {
  RequiredUploadQuestionIds,
  UploadMaxFileSizeBytes,
  UploadMaxParts,
  UploadMinFileSizeBytes,
  UploadPartSizeBytes,
  UploadQuestionIds,
  UploadSessionTtlMs,
  type UploadQuestionId,
} from "./uploadConstants";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUploadWithPresignedParts,
  type CompletedUploadPart,
} from "./r2Multipart";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: ErrorCodes; error: string };

export type UploadSummary = {
  fileId: string;
  questionId: UploadQuestionId;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  uploadedAt: Date;
};

type SubmissionRow = {
  id: string;
  status: string;
  submittedAt: Date | null;
};

export type UploadStatusResponse = {
  tenderId: string;
  submission: {
    status: "draft" | "submitted";
    submittedAt: Date | null;
  };
  uploads: Record<UploadQuestionId, UploadSummary | null>;
};

function isValidQuestionId(questionId: string): questionId is UploadQuestionId {
  for (const allowedQuestionId of UploadQuestionIds) {
    if (questionId === allowedQuestionId) {
      return true;
    }
  }

  return false;
}

function toSubmissionStatus(status: string): "draft" | "submitted" {
  return status === SubmissionStatuses.SUBMITTED
    ? SubmissionStatuses.SUBMITTED
    : SubmissionStatuses.DRAFT;
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function getActiveTender({
  db,
  tenderId,
}: WithDb<{ tenderId: string }>): Promise<{ id: string } | null> {
  const tenders = await db
    .select({ id: TenderTable.id })
    .from(TenderTable)
    .where(and(eq(TenderTable.id, tenderId), eq(TenderTable.isActive, true)));

  if (tenders.length === 0) {
    return null;
  }

  return tenders[0];
}

async function getOrCreateSubmission({
  db,
  tenderId,
  userId,
}: WithDb<{ tenderId: string; userId: string }>): Promise<
  ServiceResult<SubmissionRow>
> {
  const submissions = await db
    .select({
      id: SubmissionTable.id,
      status: SubmissionTable.status,
      submittedAt: SubmissionTable.submittedAt,
    })
    .from(SubmissionTable)
    .where(
      and(
        eq(SubmissionTable.tenderId, tenderId),
        eq(SubmissionTable.userId, userId),
        eq(SubmissionTable.isActive, true)
      )
    );

  if (submissions.length > 0) {
    return { ok: true, data: submissions[0] } as const;
  }

  const created = await db
    .insert(SubmissionTable)
    .values({
      tenderId,
      userId,
      status: SubmissionStatuses.DRAFT,
    })
    .returning({
      id: SubmissionTable.id,
      status: SubmissionTable.status,
      submittedAt: SubmissionTable.submittedAt,
    });

  if (created.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error: "Failed to create submission",
    } as const;
  }

  return { ok: true, data: created[0] } as const;
}

function validateInitiateInput({
  questionId,
  fileName,
  fileSizeBytes,
  contentType,
}: {
  questionId: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
}): ServiceResult<{
  questionId: UploadQuestionId;
  fileName: string;
  contentType: string;
  totalParts: number;
}> {
  if (!isValidQuestionId(questionId)) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Invalid questionId",
    } as const;
  }

  const normalizedFileName = sanitizeFileName(fileName);
  if (normalizedFileName.length === 0 || normalizedFileName.length > 255) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Invalid fileName",
    } as const;
  }

  const normalizedContentType = contentType.trim();
  if (normalizedContentType.length === 0 || normalizedContentType.length > 255) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Invalid contentType",
    } as const;
  }

  if (
    !Number.isInteger(fileSizeBytes) ||
    fileSizeBytes < UploadMinFileSizeBytes ||
    fileSizeBytes > UploadMaxFileSizeBytes
  ) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Invalid fileSizeBytes",
    } as const;
  }

  const totalParts = Math.ceil(fileSizeBytes / UploadPartSizeBytes);
  if (totalParts <= 0 || totalParts > UploadMaxParts) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: `totalParts must be between 1 and ${UploadMaxParts}`,
    } as const;
  }

  return {
    ok: true,
    data: {
      questionId,
      fileName: normalizedFileName,
      contentType: normalizedContentType,
      totalParts,
    },
  } as const;
}

function buildObjectKey({
  applicationId,
  questionId,
  fileName,
}: {
  applicationId: string;
  questionId: UploadQuestionId;
  fileName: string;
}): string {
  const randomId = crypto.randomUUID();
  const timestamp = Date.now();
  return `${applicationId}/${questionId}/${timestamp}-${randomId}-${fileName}`;
}

type UploadSessionRecord = {
  id: string;
  submissionId: string;
  questionId: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  objectKey: string;
  uploadId: string;
  totalParts: number;
  expiresAt: Date;
  status: string;
};

async function getUploadSession({
  db,
  uploadSessionId,
  tenderId,
  userId,
}: WithDb<{
  uploadSessionId: string;
  tenderId: string;
  userId: string;
}>): Promise<UploadSessionRecord | null> {
  const sessions = await db
    .select({
      id: UploadSessionTable.id,
      submissionId: UploadSessionTable.submissionId,
      questionId: UploadSessionTable.questionId,
      fileName: UploadSessionTable.fileName,
      fileSizeBytes: UploadSessionTable.fileSizeBytes,
      contentType: UploadSessionTable.contentType,
      objectKey: UploadSessionTable.objectKey,
      uploadId: UploadSessionTable.uploadId,
      totalParts: UploadSessionTable.totalParts,
      expiresAt: UploadSessionTable.expiresAt,
      status: UploadSessionTable.status,
    })
    .from(UploadSessionTable)
    .where(
      and(
        eq(UploadSessionTable.id, uploadSessionId),
        eq(UploadSessionTable.tenderId, tenderId),
        eq(UploadSessionTable.userId, userId),
        eq(UploadSessionTable.isActive, true)
      )
    );

  if (sessions.length === 0) {
    return null;
  }

  return sessions[0];
}

function validateCompletedParts({
  parts,
}: {
  parts: CompletedUploadPart[];
}): ServiceResult<CompletedUploadPart[]> {
  if (parts.length === 0 || parts.length > UploadMaxParts) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: `parts must contain between 1 and ${UploadMaxParts} items`,
    } as const;
  }

  const seenPartNumbers = new Set<number>();
  const normalizedParts: CompletedUploadPart[] = [];
  for (const part of parts) {
    const partNumber = part.partNumber;
    const etag = part.etag.trim();

    if (!Number.isInteger(partNumber) || partNumber <= 0 || partNumber > UploadMaxParts) {
      return {
        ok: false,
        errorCode: ErrorCodes.INVALID_INPUT,
        error: "Invalid partNumber",
      } as const;
    }

    if (etag.length === 0) {
      return {
        ok: false,
        errorCode: ErrorCodes.INVALID_INPUT,
        error: "Invalid etag",
      } as const;
    }

    if (seenPartNumbers.has(partNumber)) {
      return {
        ok: false,
        errorCode: ErrorCodes.PARTS_MISMATCH,
        error: "Duplicate partNumber received",
      } as const;
    }

    seenPartNumbers.add(partNumber);
    normalizedParts.push({ partNumber, etag });
  }

  normalizedParts.sort((left, right) => left.partNumber - right.partNumber);
  return { ok: true, data: normalizedParts } as const;
}

async function getSubmission({
  db,
  submissionId,
}: WithDb<{ submissionId: string }>): Promise<SubmissionRow | null> {
  const submissions = await db
    .select({
      id: SubmissionTable.id,
      status: SubmissionTable.status,
      submittedAt: SubmissionTable.submittedAt,
    })
    .from(SubmissionTable)
    .where(
      and(
        eq(SubmissionTable.id, submissionId),
        eq(SubmissionTable.isActive, true)
      )
    );

  if (submissions.length === 0) {
    return null;
  }

  return submissions[0];
}

function buildEmptyUploadMap(): Record<UploadQuestionId, UploadSummary | null> {
  return {
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
  };
}

export async function initiateUpload({
  db,
  env,
  userId,
  tenderId,
  questionId,
  fileName,
  fileSizeBytes,
  contentType,
}: WithDbAndEnv<{
  userId: string;
  tenderId: string;
  questionId: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
}>): Promise<
  ServiceResult<{
    uploadSessionId: string;
    uploadId: string;
    objectKey: string;
    partSizeBytes: number;
    totalParts: number;
    expiresAt: Date;
    parts: Array<{ partNumber: number; url: string; expiresAt: string }>;
  }>
> {
  const validation = validateInitiateInput({
    questionId,
    fileName,
    fileSizeBytes,
    contentType,
  });
  if (!validation.ok) {
    return validation;
  }

  const tender = await getActiveTender({ db, tenderId });
  if (!tender) {
    return {
      ok: false,
      errorCode: ErrorCodes.TENDER_NOT_FOUND,
      error: "Tender not found",
    } as const;
  }

  const submissionResult = await getOrCreateSubmission({ db, tenderId, userId });
  if (!submissionResult.ok) {
    return submissionResult;
  }

  if (submissionResult.data.status === SubmissionStatuses.SUBMITTED) {
    return {
      ok: false,
      errorCode: ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
      error: "Submission already submitted",
    } as const;
  }

  const objectKey = buildObjectKey({
    applicationId: submissionResult.data.id,
    questionId: validation.data.questionId,
    fileName: validation.data.fileName,
  });

  const multipartResult = await createMultipartUploadWithPresignedParts({
    env,
    objectKey,
    contentType: validation.data.contentType,
    totalParts: validation.data.totalParts,
  });
  if (!multipartResult.ok) {
    return multipartResult;
  }

  const expiresAt = new Date(Date.now() + UploadSessionTtlMs);

  const sessions = await db
    .insert(UploadSessionTable)
    .values({
      tenderId: tender.id,
      submissionId: submissionResult.data.id,
      userId,
      questionId: validation.data.questionId,
      fileName: validation.data.fileName,
      fileSizeBytes,
      contentType: validation.data.contentType,
      objectKey,
      uploadId: multipartResult.data.uploadId,
      partSizeBytes: UploadPartSizeBytes,
      totalParts: validation.data.totalParts,
      expiresAt,
      status: UploadSessionStatuses.INITIATED,
    })
    .returning({ id: UploadSessionTable.id });

  if (sessions.length === 0) {
    await abortMultipartUpload({
      env,
      objectKey,
      uploadId: multipartResult.data.uploadId,
    });

    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error: "Failed to persist upload session",
    } as const;
  }

  return {
    ok: true,
    data: {
      uploadSessionId: sessions[0].id,
      uploadId: multipartResult.data.uploadId,
      objectKey,
      partSizeBytes: UploadPartSizeBytes,
      totalParts: validation.data.totalParts,
      expiresAt,
      parts: multipartResult.data.parts,
    },
  } as const;
}

export async function completeUpload({
  db,
  env,
  userId,
  tenderId,
  uploadSessionId,
  parts,
}: WithDbAndEnv<{
  userId: string;
  tenderId: string;
  uploadSessionId: string;
  parts: CompletedUploadPart[];
}>): Promise<
  ServiceResult<{
    fileId: string;
    tenderId: string;
    questionId: UploadQuestionId;
    fileName: string;
    contentType: string;
    fileSizeBytes: number;
    uploadedAt: Date;
  }>
> {
  const validatedParts = validateCompletedParts({ parts });
  if (!validatedParts.ok) {
    return validatedParts;
  }

  const tender = await getActiveTender({ db, tenderId });
  if (!tender) {
    return {
      ok: false,
      errorCode: ErrorCodes.TENDER_NOT_FOUND,
      error: "Tender not found",
    } as const;
  }

  const uploadSession = await getUploadSession({
    db,
    uploadSessionId,
    tenderId: tender.id,
    userId,
  });
  if (!uploadSession) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_SESSION_NOT_FOUND,
      error: "Upload session not found",
    } as const;
  }

  if (uploadSession.status !== UploadSessionStatuses.INITIATED) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_SESSION_STATE_INVALID,
      error: "Upload session is not in initiated state",
    } as const;
  }

  if (uploadSession.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_SESSION_EXPIRED,
      error: "Upload session expired",
    } as const;
  }

  const submission = await getSubmission({
    db,
    submissionId: uploadSession.submissionId,
  });
  if (!submission) {
    return {
      ok: false,
      errorCode: ErrorCodes.SUBMISSION_NOT_FOUND,
      error: "Submission not found",
    } as const;
  }

  if (submission.status === SubmissionStatuses.SUBMITTED) {
    return {
      ok: false,
      errorCode: ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
      error: "Submission already submitted",
    } as const;
  }

  if (validatedParts.data.length !== uploadSession.totalParts) {
    return {
      ok: false,
      errorCode: ErrorCodes.PARTS_MISMATCH,
      error: "Provided parts count does not match upload session",
    } as const;
  }

  for (let partNumber = 1; partNumber <= uploadSession.totalParts; partNumber += 1) {
    const receivedPart = validatedParts.data[partNumber - 1];
    if (!receivedPart || receivedPart.partNumber !== partNumber) {
      return {
        ok: false,
        errorCode: ErrorCodes.PARTS_MISMATCH,
        error: "Missing parts in complete payload",
      } as const;
    }
  }

  const completionResult = await completeMultipartUpload({
    env,
    objectKey: uploadSession.objectKey,
    uploadId: uploadSession.uploadId,
    parts: validatedParts.data,
  });
  if (!completionResult.ok) {
    return completionResult;
  }

  const now = new Date();

  await db
    .update(UploadedFileTable)
    .set({
      isActive: false,
      updatedAt: now,
    })
    .where(
      and(
        eq(UploadedFileTable.submissionId, uploadSession.submissionId),
        eq(UploadedFileTable.questionId, uploadSession.questionId),
        eq(UploadedFileTable.isActive, true)
      )
    );

  if (!isValidQuestionId(uploadSession.questionId)) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Upload session has invalid questionId",
    } as const;
  }

  const insertedFiles = await db
    .insert(UploadedFileTable)
    .values({
      tenderId: tender.id,
      submissionId: uploadSession.submissionId,
      userId,
      questionId: uploadSession.questionId,
      uploadSessionId: uploadSession.id,
      objectKey: uploadSession.objectKey,
      fileName: uploadSession.fileName,
      fileSizeBytes: uploadSession.fileSizeBytes,
      contentType: uploadSession.contentType,
      etag: completionResult.data.etag,
      uploadedAt: now,
    })
    .returning({
      fileId: UploadedFileTable.id,
      uploadedAt: UploadedFileTable.uploadedAt,
    });

  if (insertedFiles.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error: "Failed to create uploaded file record",
    } as const;
  }

  await db
    .update(UploadSessionTable)
    .set({
      status: UploadSessionStatuses.COMPLETED,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(UploadSessionTable.id, uploadSession.id));

  return {
    ok: true,
    data: {
      fileId: insertedFiles[0].fileId,
      tenderId: tender.id,
      questionId: uploadSession.questionId,
      fileName: uploadSession.fileName,
      contentType: uploadSession.contentType,
      fileSizeBytes: uploadSession.fileSizeBytes,
      uploadedAt: insertedFiles[0].uploadedAt,
    },
  } as const;
}

export async function abortUpload({
  db,
  env,
  userId,
  tenderId,
  uploadSessionId,
}: WithDbAndEnv<{
  userId: string;
  tenderId: string;
  uploadSessionId: string;
}>): Promise<ServiceResult<{ aborted: true }>> {
  const trimmedUploadSessionId = uploadSessionId.trim();
  if (trimmedUploadSessionId.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Invalid uploadSessionId",
    } as const;
  }

  const tender = await getActiveTender({ db, tenderId });
  if (!tender) {
    return {
      ok: false,
      errorCode: ErrorCodes.TENDER_NOT_FOUND,
      error: "Tender not found",
    } as const;
  }

  const uploadSession = await getUploadSession({
    db,
    uploadSessionId: trimmedUploadSessionId,
    tenderId: tender.id,
    userId,
  });
  if (!uploadSession) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_SESSION_NOT_FOUND,
      error: "Upload session not found",
    } as const;
  }

  if (uploadSession.status !== UploadSessionStatuses.INITIATED) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_SESSION_STATE_INVALID,
      error: "Upload session cannot be aborted in current state",
    } as const;
  }

  const submission = await getSubmission({
    db,
    submissionId: uploadSession.submissionId,
  });
  if (!submission) {
    return {
      ok: false,
      errorCode: ErrorCodes.SUBMISSION_NOT_FOUND,
      error: "Submission not found",
    } as const;
  }

  if (submission.status === SubmissionStatuses.SUBMITTED) {
    return {
      ok: false,
      errorCode: ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
      error: "Submission already submitted",
    } as const;
  }

  const abortResult = await abortMultipartUpload({
    env,
    objectKey: uploadSession.objectKey,
    uploadId: uploadSession.uploadId,
  });
  if (!abortResult.ok) {
    return abortResult;
  }

  await db
    .update(UploadSessionTable)
    .set({
      status: UploadSessionStatuses.ABORTED,
      updatedAt: new Date(),
    })
    .where(eq(UploadSessionTable.id, uploadSession.id));

  return abortResult;
}

export async function getUploadStatus({
  db,
  userId,
  tenderId,
}: WithDb<{
  userId: string;
  tenderId: string;
}>): Promise<ServiceResult<UploadStatusResponse>> {
  const tender = await getActiveTender({ db, tenderId });
  if (!tender) {
    return {
      ok: false,
      errorCode: ErrorCodes.TENDER_NOT_FOUND,
      error: "Tender not found",
    } as const;
  }

  const uploads = buildEmptyUploadMap();

  const submissions = await db
    .select({
      id: SubmissionTable.id,
      status: SubmissionTable.status,
      submittedAt: SubmissionTable.submittedAt,
    })
    .from(SubmissionTable)
    .where(
      and(
        eq(SubmissionTable.tenderId, tender.id),
        eq(SubmissionTable.userId, userId),
        eq(SubmissionTable.isActive, true)
      )
    );

  if (submissions.length === 0) {
    return {
      ok: true,
      data: {
        tenderId: tender.id,
        submission: { status: "draft", submittedAt: null },
        uploads,
      },
    } as const;
  }

  const submission = submissions[0];

  const activeUploads = await db
    .select({
      fileId: UploadedFileTable.id,
      questionId: UploadedFileTable.questionId,
      fileName: UploadedFileTable.fileName,
      fileSizeBytes: UploadedFileTable.fileSizeBytes,
      contentType: UploadedFileTable.contentType,
      uploadedAt: UploadedFileTable.uploadedAt,
    })
    .from(UploadedFileTable)
    .where(
      and(
        eq(UploadedFileTable.submissionId, submission.id),
        eq(UploadedFileTable.isActive, true),
        inArray(UploadedFileTable.questionId, [...UploadQuestionIds])
      )
    );

  for (const upload of activeUploads) {
    if (!isValidQuestionId(upload.questionId)) {
      continue;
    }

    uploads[upload.questionId] = {
      fileId: upload.fileId,
      questionId: upload.questionId,
      fileName: upload.fileName,
      fileSizeBytes: upload.fileSizeBytes,
      contentType: upload.contentType,
      uploadedAt: upload.uploadedAt,
    };
  }

  return {
    ok: true,
    data: {
      tenderId: tender.id,
      submission: {
        status: toSubmissionStatus(submission.status),
        submittedAt: submission.submittedAt,
      },
      uploads,
    },
  } as const;
}

export async function submitTender({
  db,
  userId,
  tenderId,
}: WithDb<{
  userId: string;
  tenderId: string;
}>): Promise<
  ServiceResult<{
    tenderId: string;
    status: "submitted";
    submittedAt: Date;
  }>
> {
  const tender = await getActiveTender({ db, tenderId });
  if (!tender) {
    return {
      ok: false,
      errorCode: ErrorCodes.TENDER_NOT_FOUND,
      error: "Tender not found",
    } as const;
  }

  const submissionResult = await getOrCreateSubmission({
    db,
    tenderId: tender.id,
    userId,
  });
  if (!submissionResult.ok) {
    return submissionResult;
  }

  if (submissionResult.data.status === SubmissionStatuses.SUBMITTED) {
    return {
      ok: false,
      errorCode: ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
      error: "Submission already submitted",
    } as const;
  }

  const requiredUploads = await db
    .select({
      questionId: UploadedFileTable.questionId,
    })
    .from(UploadedFileTable)
    .where(
      and(
        eq(UploadedFileTable.submissionId, submissionResult.data.id),
        eq(UploadedFileTable.isActive, true),
        inArray(UploadedFileTable.questionId, [...RequiredUploadQuestionIds])
      )
    );

  const presentQuestionIds = new Set<string>();
  for (const requiredUpload of requiredUploads) {
    presentQuestionIds.add(requiredUpload.questionId);
  }

  const missingQuestionIds: string[] = [];
  for (const requiredQuestionId of RequiredUploadQuestionIds) {
    if (!presentQuestionIds.has(requiredQuestionId)) {
      missingQuestionIds.push(requiredQuestionId);
    }
  }

  if (missingQuestionIds.length > 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.MISSING_REQUIRED_UPLOADS,
      error: `Missing required uploads: ${missingQuestionIds.join(", ")}`,
    } as const;
  }

  const submittedAt = new Date();
  const updatedSubmissions = await db
    .update(SubmissionTable)
    .set({
      status: SubmissionStatuses.SUBMITTED,
      submittedAt,
      updatedAt: submittedAt,
    })
    .where(eq(SubmissionTable.id, submissionResult.data.id))
    .returning({ submittedAt: SubmissionTable.submittedAt });

  if (updatedSubmissions.length === 0 || updatedSubmissions[0].submittedAt === null) {
    return {
      ok: false,
      errorCode: ErrorCodes.SUBMISSION_NOT_FOUND,
      error: "Failed to mark submission as submitted",
    } as const;
  }

  return {
    ok: true,
    data: {
      tenderId: tender.id,
      status: "submitted",
      submittedAt: updatedSubmissions[0].submittedAt,
    },
  } as const;
}
