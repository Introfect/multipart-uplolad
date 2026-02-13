import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { WithEnv } from "../utils/commonTypes";
import { ErrorCodes } from "../utils/error";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: ErrorCodes; error: string };

type R2ClientData = {
  client: S3Client;
  bucket: string;
};

export type CompletedUploadPart = {
  partNumber: number;
  etag: string;
};

export type PresignedPart = {
  partNumber: number;
  url: string;
  expiresAt: string;
};

const PresignedUrlTtlSeconds = 60 * 60;

function getR2Client({
  env,
}: WithEnv<{}>): ServiceResult<R2ClientData> {
  const accountId = env.R2_ACCOUNT_ID.trim();
  const bucket = env.R2_BUCKET.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY.trim();

  if (
    accountId.length === 0 ||
    bucket.length === 0 ||
    accessKeyId.length === 0 ||
    secretAccessKey.length === 0
  ) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Missing R2 S3 configuration variables",
    } as const;
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    ok: true,
    data: { client, bucket },
  } as const;
}

export async function createMultipartUploadWithPresignedParts({
  env,
  objectKey,
  contentType,
  totalParts,
}: WithEnv<{
  objectKey: string;
  contentType: string;
  totalParts: number;
}>): Promise<
  ServiceResult<{
    uploadId: string;
    parts: PresignedPart[];
  }>
> {
  if (!Number.isInteger(totalParts) || totalParts <= 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "totalParts must be a positive integer",
    } as const;
  }

  const r2ClientResult = getR2Client({ env });
  if (!r2ClientResult.ok) {
    return r2ClientResult;
  }

  const { client, bucket } = r2ClientResult.data;

  try {
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    const created = await client.send(createCommand);

    if (typeof created.UploadId !== "string" || created.UploadId.length === 0) {
      return {
        ok: false,
        errorCode: ErrorCodes.UPLOAD_CONFLICT,
        error: "Failed to create multipart upload session",
      } as const;
    }

    const expiresAt = new Date(
      Date.now() + PresignedUrlTtlSeconds * 1000
    ).toISOString();

    const partPromises = Array.from({ length: totalParts }, async (_, index) => {
      const partNumber = index + 1;
      const partCommand = new UploadPartCommand({
        Bucket: bucket,
        Key: objectKey,
        UploadId: created.UploadId,
        PartNumber: partNumber,
      });
      const url = await getSignedUrl(client, partCommand, {
        expiresIn: PresignedUrlTtlSeconds,
      });

      return { partNumber, url, expiresAt } as const;
    });

    const parts = await Promise.all(partPromises);

    return {
      ok: true,
      data: {
        uploadId: created.UploadId,
        parts,
      },
    } as const;
  } catch (error) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create multipart upload",
    } as const;
  }
}

function toCompletedParts({
  parts,
}: {
  parts: CompletedUploadPart[];
}): CompletedPart[] {
  return parts
    .map((part) => ({
      PartNumber: part.partNumber,
      ETag: part.etag,
    }))
    .sort((left, right) => left.PartNumber! - right.PartNumber!);
}

export async function completeMultipartUpload({
  env,
  objectKey,
  uploadId,
  parts,
}: WithEnv<{
  objectKey: string;
  uploadId: string;
  parts: CompletedUploadPart[];
}>): Promise<ServiceResult<{ etag: string }>> {
  const r2ClientResult = getR2Client({ env });
  if (!r2ClientResult.ok) {
    return r2ClientResult;
  }

  const { client, bucket } = r2ClientResult.data;

  try {
    const completedParts = toCompletedParts({ parts });
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: objectKey,
      UploadId: uploadId,
      MultipartUpload: { Parts: completedParts },
    });
    const result = await client.send(completeCommand);
    const etag = result.ETag;

    if (typeof etag !== "string" || etag.length === 0) {
      return {
        ok: false,
        errorCode: ErrorCodes.UPLOAD_CONFLICT,
        error: "Multipart upload completed without ETag",
      } as const;
    }

    return {
      ok: true,
      data: { etag },
    } as const;
  } catch (error) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error:
        error instanceof Error
          ? error.message
          : "Failed to complete multipart upload",
    } as const;
  }
}

export async function abortMultipartUpload({
  env,
  objectKey,
  uploadId,
}: WithEnv<{
  objectKey: string;
  uploadId: string;
}>): Promise<ServiceResult<{ aborted: true }>> {
  const r2ClientResult = getR2Client({ env });
  if (!r2ClientResult.ok) {
    return r2ClientResult;
  }

  const { client, bucket } = r2ClientResult.data;

  try {
    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: objectKey,
      UploadId: uploadId,
    });
    await client.send(abortCommand);

    return {
      ok: true,
      data: { aborted: true },
    } as const;
  } catch (error) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error:
        error instanceof Error ? error.message : "Failed to abort upload session",
    } as const;
  }
}
