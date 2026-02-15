import { z } from "@hono/zod-openapi";
import { getUserFromApiKeyWithRole } from "../features/auth";
import { connectDb } from "../features/db/connect";
import { completeUpload, getActiveTender, initiateUpload } from "../features/uploads";
import type { R2StorageDebugInfo } from "../features/r2Multipart";
import {
  UploadAllowedRoleName,
  UploadQuestionIds,
} from "../features/uploadConstants";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

export const uploadAliasEndpoint = getHono();

const InitiateUploadDataSchema = z.discriminatedUnion("uploadType", [
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
    totalParts: z.number().int(),
    expiresAt: z.string().datetime(),
    parts: z.array(
      z.object({
        partNumber: z.number().int(),
        url: z.string().url(),
        expiresAt: z.string().datetime(),
      })
    ),
  }),
]);

const UploadedFileSummarySchema = z.object({
  fileId: z.string(),
  questionId: z.enum(UploadQuestionIds),
  fileName: z.string(),
  fileSizeBytes: z.number().int(),
  contentType: z.string(),
  uploadedAt: z.string().datetime(),
});

type WriteErrorStatus = 400 | 403 | 404 | 409 | 500 | 503;

type UploadErrorPayload = {
  ok: false;
  errorCode: ErrorCodes;
  error: string;
  debug?: R2StorageDebugInfo;
};

function getWriteErrorStatus(errorCode: ErrorCodes): WriteErrorStatus {
  switch (errorCode) {
    case ErrorCodes.INVALID_INPUT:
    case ErrorCodes.MISSING_REQUIRED_UPLOADS:
      return 400;
    case ErrorCodes.FORBIDDEN_ROLE:
    case ErrorCodes.SUBMISSION_ALREADY_SUBMITTED:
      return 403;
    case ErrorCodes.TENDER_NOT_FOUND:
    case ErrorCodes.SUBMISSION_NOT_FOUND:
    case ErrorCodes.UPLOAD_SESSION_NOT_FOUND:
      return 404;
    case ErrorCodes.UPLOAD_CONFLICT:
    case ErrorCodes.UPLOAD_SESSION_EXPIRED:
    case ErrorCodes.UPLOAD_SESSION_STATE_INVALID:
    case ErrorCodes.PARTS_MISMATCH:
      return 409;
    case ErrorCodes.UPLOAD_CONFIG_INVALID:
      return 500;
    case ErrorCodes.UPLOAD_PROVIDER_UNAVAILABLE:
      return 503;
    default:
      return 400;
  }
}

function shouldExposeUploadDebug(env: Env): boolean {
  const flag = env.UPLOAD_DEBUG_ERRORS.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

function isUploadInfraError(errorCode: ErrorCodes): boolean {
  return (
    errorCode === ErrorCodes.UPLOAD_PROVIDER_UNAVAILABLE ||
    errorCode === ErrorCodes.UPLOAD_CONFIG_INVALID
  );
}

function getUploadErrorPayload({
  env,
  errorCode,
  error,
  debug,
}: {
  env: Env;
  errorCode: ErrorCodes;
  error: string;
  debug?: R2StorageDebugInfo;
}): UploadErrorPayload {
  if (shouldExposeUploadDebug(env) && isUploadInfraError(errorCode) && debug) {
    return {
      ok: false,
      errorCode,
      error,
      debug,
    } as const;
  }

  return {
    ok: false,
    errorCode,
    error,
  } as const;
}

uploadAliasEndpoint.openapi(
  {
    method: "post",
    path: "/init",
    tags: ["uploads"],
    summary: "Alias for upload initiation",
    request: {
      headers: ApiKeyHeaderSchema,
      body: jsonContent(
        z.object({
          tenderId: z.string().min(1),
          questionId: z.enum(UploadQuestionIds),
          fileName: z.string().min(1),
          fileSizeBytes: z.number().int().positive(),
          contentType: z.string().min(1),
        })
      ),
    },
    responses: {
      200: {
        description: "Upload session created",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: InitiateUploadDataSchema,
            }),
          },
        },
      },
      400: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      401: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      403: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      404: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      409: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      500: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      503: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const apiKey = c.req.valid("header")["x-api-key"];
      const request = c.req.valid("json");

      const authResult = await getUserFromApiKeyWithRole({
        apiKey,
        db,
        env: c.env,
        roleName: UploadAllowedRoleName,
      });
      if (!authResult.ok) {
        const status = authResult.errorCode === ErrorCodes.FORBIDDEN_ROLE ? 403 : 401;
        return c.json(
          {
            ok: false,
            errorCode: authResult.errorCode,
            error: authResult.error,
          } as const,
          status
        );
      }

      const tender = await getActiveTender({ db, tenderId: request.tenderId });
      if (!tender) {
        return c.json(
          {
            ok: false,
            errorCode: ErrorCodes.TENDER_NOT_FOUND,
            error: "Tender not found",
          } as const,
          404
        );
      }

      const result = await initiateUpload({
        db,
        env: c.env,
        userId: authResult.user.id,
        tender,
        questionId: request.questionId,
        fileName: request.fileName,
        fileSizeBytes: request.fileSizeBytes,
        contentType: request.contentType,
      });

      if (!result.ok) {
        return c.json(
          getUploadErrorPayload({
            env: c.env,
            errorCode: result.errorCode,
            error: result.error,
            debug: result.debug,
          }),
          getWriteErrorStatus(result.errorCode)
        );
      }

      return c.json(
        {
          ok: true,
          data: {
            ...result.data,
            expiresAt: result.data.expiresAt.toISOString(),
          },
        } as const,
        200
      );
    } catch (err) {
      const normalizedError =
        err instanceof Error ||
        typeof err === "string" ||
        typeof err === "number" ||
        typeof err === "boolean" ||
        typeof err === "object"
          ? err
          : undefined;
      return handleApiErrors(c, normalizedError);
    }
  }
);

uploadAliasEndpoint.openapi(
  {
    method: "post",
    path: "/complete",
    tags: ["uploads"],
    summary: "Alias for upload completion",
    request: {
      headers: ApiKeyHeaderSchema,
      body: jsonContent(
        z.object({
          tenderId: z.string().min(1),
          uploadSessionId: z.string().min(1),
          parts: z
            .array(
              z.object({
                partNumber: z.number().int().positive(),
                etag: z.string().min(1),
              })
            )
            .min(1)
            .optional(),
          etag: z.string().min(1).optional(),
        })
      ),
    },
    responses: {
      200: {
        description: "Upload completed",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: UploadedFileSummarySchema,
            }),
          },
        },
      },
      400: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      401: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      403: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      404: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      409: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      500: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      503: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const apiKey = c.req.valid("header")["x-api-key"];
      const request = c.req.valid("json");

      const authResult = await getUserFromApiKeyWithRole({
        apiKey,
        db,
        env: c.env,
        roleName: UploadAllowedRoleName,
      });
      if (!authResult.ok) {
        const status = authResult.errorCode === ErrorCodes.FORBIDDEN_ROLE ? 403 : 401;
        return c.json(
          {
            ok: false,
            errorCode: authResult.errorCode,
            error: authResult.error,
          } as const,
          status
        );
      }

      const tender = await getActiveTender({ db, tenderId: request.tenderId });
      if (!tender) {
        return c.json(
          {
            ok: false,
            errorCode: ErrorCodes.TENDER_NOT_FOUND,
            error: "Tender not found",
          } as const,
          404
        );
      }

      const result = await completeUpload({
        db,
        env: c.env,
        userId: authResult.user.id,
        tender,
        uploadSessionId: request.uploadSessionId,
        parts: request.parts,
        etag: request.etag,
      });

      if (!result.ok) {
        return c.json(
          getUploadErrorPayload({
            env: c.env,
            errorCode: result.errorCode,
            error: result.error,
            debug: result.debug,
          }),
          getWriteErrorStatus(result.errorCode)
        );
      }

      return c.json(
        {
          ok: true,
          data: {
            ...result.data,
            uploadedAt: result.data.uploadedAt.toISOString(),
          },
        } as const,
        200
      );
    } catch (err) {
      const normalizedError =
        err instanceof Error ||
        typeof err === "string" ||
        typeof err === "number" ||
        typeof err === "boolean" ||
        typeof err === "object"
          ? err
          : undefined;
      return handleApiErrors(c, normalizedError);
    }
  }
);
