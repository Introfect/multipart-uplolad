import { DOMParser } from "@xmldom/xmldom";

if (typeof globalThis.DOMParser === "undefined") {
  (globalThis as any).DOMParser = DOMParser;
}

if (typeof globalThis.Node === "undefined") {
  (globalThis as any).Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
  };
}

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { WithEnv } from "../utils/commonTypes";
import { ErrorCodes } from "../utils/error";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: ErrorCodes; error: string; debug?: R2StorageDebugInfo };

const RuntimeNames = {
  WORKER: "worker",
  NODE: "node",
  UNKNOWN: "unknown",
} as const;

type RuntimeName = (typeof RuntimeNames)[keyof typeof RuntimeNames];

const R2OperationNames = {
  CREATE_SINGLE_UPLOAD_URL: "create_single_upload_url",
  CREATE_MULTIPART_UPLOAD: "create_multipart_upload",
  COMPLETE_MULTIPART_UPLOAD: "complete_multipart_upload",
  ABORT_MULTIPART_UPLOAD: "abort_multipart_upload",
} as const;

type R2OperationName = (typeof R2OperationNames)[keyof typeof R2OperationNames];

const R2ConfigDebugReasons = {
  MISSING_BINDINGS: "missing_bindings",
  PLACEHOLDER_CREDENTIALS: "placeholder_credentials",
  INVALID_ACCOUNT_ID: "invalid_account_id",
} as const;

type R2ConfigDebugReason =
  (typeof R2ConfigDebugReasons)[keyof typeof R2ConfigDebugReasons];

export type R2ConfigDebugInfo = {
  kind: "config";
  reason: R2ConfigDebugReason;
  runtime: RuntimeName;
  endpoint: string | null;
  missingBindings: string[];
};

export type R2ProviderDebugInfo = {
  kind: "provider";
  operation: R2OperationName;
  runtime: RuntimeName;
  endpoint: string;
  causeCode: string;
  providerStatus: number | null;
  providerRequestId: string | null;
  attemptCount: number;
  retryable: boolean;
  rawMessage: string;
};

export type R2StorageDebugInfo = R2ConfigDebugInfo | R2ProviderDebugInfo;

type R2ClientData = {
  client: S3Client;
  bucket: string;
  endpoint: string;
  runtime: RuntimeName;
};

type StorageErrorMetadata = {
  httpStatusCode?: number;
  requestId?: string;
};

type StorageErrorLike = {
  name?: string;
  code?: string;
  message?: string;
  $metadata?: StorageErrorMetadata;
  cause?: StorageErrorInput;
};

type StorageErrorInput =
  | Error
  | StorageErrorLike
  | string
  | number
  | boolean
  | null
  | undefined;

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
const ProviderRetryDelaysMs = [250, 750] as const;
const ProviderMaxAttempts = ProviderRetryDelaysMs.length + 1;

const RetryableProviderCauseCodes = [
  "NetworkingError",
  "TimeoutError",
  "RequestTimeout",
  "RequestTimeoutException",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
  "TLS_HANDSHAKE_FAILURE",
] as const;

const NonRetryableProviderCauseCodes = ["DOM_PARSER_UNAVAILABLE"] as const;

function isPlaceholderValue(value: string): boolean {
  return value.startsWith("replace-with-");
}

function isLikelyCloudflareAccountId(accountId: string): boolean {
  return /^[a-f0-9]{32}$/i.test(accountId);
}

function sanitizeStorageErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("handshake_failure") ||
    lower.includes("sslv3_alert_handshake_failure") ||
    lower.includes("openssl_internal") ||
    lower.includes("certificate") ||
    lower.includes("domparser") ||
    lower.includes("deserialization error") ||
    lower.includes("inspect the hidden field") ||
    lower.includes("$response")
  ) {
    return "Upload service is temporarily unavailable. Please retry.";
  }

  return message;
}

function getRuntimeName(): RuntimeName {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("Cloudflare-Workers")) {
    return RuntimeNames.WORKER;
  }

  if (typeof process !== "undefined" && typeof process.versions?.node === "string") {
    return RuntimeNames.NODE;
  }

  return RuntimeNames.UNKNOWN;
}

function getR2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getRequestHandler(): FetchHttpHandler | undefined {
  if (typeof fetch !== "function") {
    return undefined;
  }

  return new FetchHttpHandler();
}

function normalizeStorageError(error: StorageErrorInput): StorageErrorLike {
  if (error instanceof Error) {
    const typedError = error as Error & {
      code?: string;
      $metadata?: StorageErrorMetadata;
      cause?: StorageErrorInput;
    };
    return {
      name: error.name,
      code: typedError.code,
      message: error.message,
      $metadata: typedError.$metadata,
      cause: typedError.cause,
    };
  }

  if (typeof error === "object" && error !== null) {
    return error;
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return { message: String(error) };
  }

  return {};
}

function getNestedCauseCode(error: StorageErrorLike): string | null {
  const cause = error.cause;
  if (!cause) {
    return null;
  }

  const nested = normalizeStorageError(cause);
  const fromCode = nested.code?.trim();
  if (typeof fromCode === "string" && fromCode.length > 0) {
    return fromCode;
  }

  const fromName = nested.name?.trim();
  if (typeof fromName === "string" && fromName.length > 0) {
    return fromName;
  }

  return null;
}

function getProviderCauseCode(error: StorageErrorLike): string {
  const fromCode = error.code?.trim();
  if (typeof fromCode === "string" && fromCode.length > 0) {
    return fromCode;
  }

  const fromName = error.name?.trim();
  if (typeof fromName === "string" && fromName.length > 0) {
    return fromName;
  }

  const nestedCauseCode = getNestedCauseCode(error);
  if (nestedCauseCode) {
    return nestedCauseCode;
  }

  const normalizedMessage = (error.message ?? "").toLowerCase();
  if (
    normalizedMessage.includes("handshake_failure") ||
    normalizedMessage.includes("sslv3_alert_handshake_failure")
  ) {
    return "TLS_HANDSHAKE_FAILURE";
  }
  if (normalizedMessage.includes("domparser")) {
    return "DOM_PARSER_UNAVAILABLE";
  }
  if (normalizedMessage.includes("timeout")) {
    return "TimeoutError";
  }
  if (normalizedMessage.includes("econnreset")) {
    return "ECONNRESET";
  }

  return "UNKNOWN_PROVIDER_ERROR";
}

function isRetryableProviderError({
  causeCode,
  providerStatus,
  message,
}: {
  causeCode: string;
  providerStatus: number | null;
  message: string;
}): boolean {
  for (const nonRetryableCode of NonRetryableProviderCauseCodes) {
    if (causeCode === nonRetryableCode) {
      return false;
    }
  }

  if (providerStatus === 429 || (providerStatus !== null && providerStatus >= 500)) {
    return true;
  }

  for (const retryableCode of RetryableProviderCauseCodes) {
    if (causeCode === retryableCode) {
      return true;
    }
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("connection reset") ||
    lower.includes("temporarily unavailable")
  ) {
    return true;
  }

  return false;
}

function getReadableStorageError(error: StorageErrorLike): string {
  const message = error.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return sanitizeStorageErrorMessage(message);
  }

  const nestedCause = error.cause;
  if (typeof nestedCause === "string" && nestedCause.trim().length > 0) {
    return sanitizeStorageErrorMessage(nestedCause);
  }

  if (nestedCause instanceof Error && nestedCause.message.trim().length > 0) {
    return sanitizeStorageErrorMessage(nestedCause.message);
  }

  if (typeof nestedCause === "object" && nestedCause !== null) {
    const nestedMessage = normalizeStorageError(nestedCause).message;
    if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
      return sanitizeStorageErrorMessage(nestedMessage);
    }
  }

  return "Failed to communicate with R2";
}

function buildProviderDebugInfo({
  error,
  operation,
  endpoint,
  runtime,
  attemptCount,
}: {
  error: StorageErrorInput;
  operation: R2OperationName;
  endpoint: string;
  runtime: RuntimeName;
  attemptCount: number;
}): R2ProviderDebugInfo {
  const normalizedError = normalizeStorageError(error);
  const message = normalizedError.message ?? "Failed to communicate with R2";
  const causeCode = getProviderCauseCode(normalizedError);
  const providerStatus = normalizedError.$metadata?.httpStatusCode ?? null;
  const providerRequestId = normalizedError.$metadata?.requestId ?? null;
  const retryable = isRetryableProviderError({
    causeCode,
    providerStatus,
    message,
  });

  return {
    kind: "provider",
    operation,
    runtime,
    endpoint,
    causeCode,
    providerStatus,
    providerRequestId,
    attemptCount,
    retryable,
    rawMessage: message,
  };
}

function getRetryDelayMs(attemptCount: number): number {
  if (attemptCount <= 1) {
    return ProviderRetryDelaysMs[0];
  }

  const retryIndex = attemptCount - 1;
  if (retryIndex >= ProviderRetryDelaysMs.length) {
    return ProviderRetryDelaysMs[ProviderRetryDelaysMs.length - 1];
  }

  return ProviderRetryDelaysMs[retryIndex];
}

async function waitForRetry(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function runR2ProviderOperation<T>({
  operation,
  endpoint,
  runtime,
  run,
}: {
  operation: R2OperationName;
  endpoint: string;
  runtime: RuntimeName;
  run: () => Promise<T>;
}): Promise<ServiceResult<T>> {
  let attemptCount = 0;

  while (attemptCount < ProviderMaxAttempts) {
    attemptCount += 1;

    try {
      const data = await run();
      return { ok: true, data } as const;
    } catch (error) {
      const normalizedError =
        error instanceof Error ||
          typeof error === "string" ||
          typeof error === "number" ||
          typeof error === "boolean" ||
          typeof error === "object"
          ? error
          : undefined;

      const debug = buildProviderDebugInfo({
        error: normalizedError,
        operation,
        endpoint,
        runtime,
        attemptCount,
      });
      const shouldRetry = debug.retryable && attemptCount < ProviderMaxAttempts;
      if (!shouldRetry) {
        return {
          ok: false,
          errorCode: ErrorCodes.UPLOAD_PROVIDER_UNAVAILABLE,
          error: getReadableStorageError(normalizeStorageError(normalizedError)),
          debug,
        } as const;
      }

      await waitForRetry(getRetryDelayMs(attemptCount));
    }
  }

  return {
    ok: false,
    errorCode: ErrorCodes.UPLOAD_PROVIDER_UNAVAILABLE,
    error: "Upload service is temporarily unavailable. Please retry.",
    debug: {
      kind: "provider",
      operation,
      runtime,
      endpoint,
      causeCode: "UNKNOWN_PROVIDER_ERROR",
      providerStatus: null,
      providerRequestId: null,
      attemptCount: ProviderMaxAttempts,
      retryable: false,
      rawMessage: "Exceeded retry attempts",
    },
  } as const;
}

function getR2Client({
  env,
}: WithEnv<{}>): ServiceResult<R2ClientData> {
  const accountId = (env.R2_ACCOUNT_ID ?? "").trim();
  const bucket = (env.R2_BUCKET_NAME ?? "").trim();
  const accessKeyId = (env.R2_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (env.R2_SECRET_ACCESS_KEY ?? "").trim();
  const runtime = getRuntimeName();
  const endpoint = accountId.length > 0 ? getR2Endpoint(accountId) : null;

  const missingBindings: string[] = [];
  if (accountId.length === 0) {
    missingBindings.push("R2_ACCOUNT_ID");
  }
  if (bucket.length === 0) {
    missingBindings.push("R2_BUCKET_NAME");
  }
  if (accessKeyId.length === 0) {
    missingBindings.push("R2_ACCESS_KEY_ID");
  }
  if (secretAccessKey.length === 0) {
    missingBindings.push("R2_SECRET_ACCESS_KEY");
  }

  if (missingBindings.length > 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFIG_INVALID,
      error: `Missing R2 S3 configuration variables: ${missingBindings.join(", ")}`,
      debug: {
        kind: "config",
        reason: R2ConfigDebugReasons.MISSING_BINDINGS,
        runtime,
        endpoint,
        missingBindings,
      },
    } as const;
  }

  if (
    isPlaceholderValue(accountId) ||
    isPlaceholderValue(bucket) ||
    isPlaceholderValue(accessKeyId) ||
    isPlaceholderValue(secretAccessKey)
  ) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFIG_INVALID,
      error:
        "R2 credentials are placeholders. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
      debug: {
        kind: "config",
        reason: R2ConfigDebugReasons.PLACEHOLDER_CREDENTIALS,
        runtime,
        endpoint,
        missingBindings: [],
      },
    } as const;
  }

  if (!isLikelyCloudflareAccountId(accountId)) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFIG_INVALID,
      error: "R2_ACCOUNT_ID must be a valid Cloudflare account id.",
      debug: {
        kind: "config",
        reason: R2ConfigDebugReasons.INVALID_ACCOUNT_ID,
        runtime,
        endpoint,
        missingBindings: [],
      },
    } as const;
  }

  const resolvedEndpoint = getR2Endpoint(accountId);
  const requestHandler = getRequestHandler();
  const client = new S3Client({
    region: "auto",
    endpoint: resolvedEndpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    ...(requestHandler ? { requestHandler } : {}),
  });

  return {
    ok: true,
    data: {
      client,
      bucket,
      endpoint: resolvedEndpoint,
      runtime,
    },
  } as const;
}

export async function createSingleUploadWithPresignedUrl({
  env,
  objectKey,
  contentType,
}: WithEnv<{
  objectKey: string;
  contentType: string;
}>): Promise<
  ServiceResult<{
    url: string;
    expiresAt: string;
  }>
> {
  const r2ClientResult = getR2Client({ env });
  if (!r2ClientResult.ok) {
    return r2ClientResult;
  }

  const { client, bucket, endpoint, runtime } = r2ClientResult.data;

  return runR2ProviderOperation({
    operation: R2OperationNames.CREATE_SINGLE_UPLOAD_URL,
    endpoint,
    runtime,
    run: async () => {
      const putObjectCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
      });
      const url = await getSignedUrl(client, putObjectCommand, {
        expiresIn: PresignedUrlTtlSeconds,
      });
      const expiresAt = new Date(
        Date.now() + PresignedUrlTtlSeconds * 1000
      ).toISOString();

      return { url, expiresAt };
    },
  });
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

  const { client, bucket, endpoint, runtime } = r2ClientResult.data;

  const createResult = await runR2ProviderOperation({
    operation: R2OperationNames.CREATE_MULTIPART_UPLOAD,
    endpoint,
    runtime,
    run: async () => {
      const createCommand = new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: contentType,
      });
      const created = await client.send(createCommand);
      return { uploadId: created.UploadId };
    },
  });
  if (!createResult.ok) {
    return createResult;
  }

  if (typeof createResult.data.uploadId !== "string" || createResult.data.uploadId.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error: "Failed to create multipart upload session",
    } as const;
  }

  try {
    const expiresAt = new Date(
      Date.now() + PresignedUrlTtlSeconds * 1000
    ).toISOString();

    const partPromises = Array.from({ length: totalParts }, async (_, index) => {
      const partNumber = index + 1;
      const partCommand = new UploadPartCommand({
        Bucket: bucket,
        Key: objectKey,
        UploadId: createResult.data.uploadId,
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
        uploadId: createResult.data.uploadId,
        parts,
      },
    } as const;
  } catch (error) {
    const normalizedError =
      error instanceof Error ||
        typeof error === "string" ||
        typeof error === "number" ||
        typeof error === "boolean" ||
        typeof error === "object"
        ? error
        : undefined;
    const debug = buildProviderDebugInfo({
      error: normalizedError,
      operation: R2OperationNames.CREATE_MULTIPART_UPLOAD,
      endpoint,
      runtime,
      attemptCount: 1,
    });

    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_PROVIDER_UNAVAILABLE,
      error: getReadableStorageError(normalizeStorageError(normalizedError)),
      debug,
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

  const { client, bucket, endpoint, runtime } = r2ClientResult.data;

  const completionResult = await runR2ProviderOperation({
    operation: R2OperationNames.COMPLETE_MULTIPART_UPLOAD,
    endpoint,
    runtime,
    run: async () => {
      const completedParts = toCompletedParts({ parts });
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: objectKey,
        UploadId: uploadId,
        MultipartUpload: { Parts: completedParts },
      });
      const result = await client.send(completeCommand);
      return { etag: result.ETag };
    },
  });
  if (!completionResult.ok) {
    return completionResult;
  }

  if (
    typeof completionResult.data.etag !== "string" ||
    completionResult.data.etag.length === 0
  ) {
    return {
      ok: false,
      errorCode: ErrorCodes.UPLOAD_CONFLICT,
      error: "Multipart upload completed without ETag",
    } as const;
  }

  return {
    ok: true,
    data: { etag: completionResult.data.etag },
  } as const;
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

  const { client, bucket, endpoint, runtime } = r2ClientResult.data;

  const abortResult = await runR2ProviderOperation({
    operation: R2OperationNames.ABORT_MULTIPART_UPLOAD,
    endpoint,
    runtime,
    run: async () => {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: objectKey,
        UploadId: uploadId,
      });
      await client.send(abortCommand);
      return { aborted: true as const };
    },
  });
  if (!abortResult.ok) {
    return abortResult;
  }

  return {
    ok: true,
    data: abortResult.data,
  } as const;
}
