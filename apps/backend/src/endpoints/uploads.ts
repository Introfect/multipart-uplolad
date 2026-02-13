import { z } from "@hono/zod-openapi";
import { getUserFromApiKeyWithRole } from "../features/auth";
import { connectDb } from "../features/db/connect";
import {
  abortUpload,
  completeUpload,
  getUploadStatus,
  initiateUpload,
} from "../features/uploads";
import { UploadAllowedRoleName } from "../features/uploadConstants";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

export const uploadsEndpoint = getHono();

const UploadedFileSummarySchema = z.object({
  fileId: z.string(),
  questionId: z.enum(["q1", "q2", "q3", "q4", "q5"]),
  fileName: z.string(),
  fileSizeBytes: z.number().int(),
  contentType: z.string(),
  uploadedAt: z.string().datetime(),
});

type WriteErrorStatus = 400 | 403 | 404 | 409;
type ReadErrorStatus = 400 | 404;

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
    default:
      return 400;
  }
}

function getReadErrorStatus(errorCode: ErrorCodes): ReadErrorStatus {
  switch (errorCode) {
    case ErrorCodes.TENDER_NOT_FOUND:
      return 404;
    default:
      return 400;
  }
}

uploadsEndpoint.openapi(
  {
    method: "post",
    path: "/initiate",
    tags: ["uploads"],
    summary: "Create multipart session and presigned part URLs",
    request: {
      headers: ApiKeyHeaderSchema,
      body: jsonContent(
        z.object({
          tenderId: z.string().min(1),
          questionId: z.string().min(1),
          fileName: z.string().min(1),
          fileSizeBytes: z.number().int().positive(),
          contentType: z.string().min(1),
        })
      ),
    },
    responses: {
      200: {
        description: "Multipart session created",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: z.object({
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
            }),
          },
        },
      },
      400: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      401: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      403: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      404: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      409: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
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

      const result = await initiateUpload({
        db,
        env: c.env,
        userId: authResult.user.id,
        tenderId: request.tenderId,
        questionId: request.questionId,
        fileName: request.fileName,
        fileSizeBytes: request.fileSizeBytes,
        contentType: request.contentType,
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
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

uploadsEndpoint.openapi(
  {
    method: "post",
    path: "/complete",
    tags: ["uploads"],
    summary: "Complete multipart upload and create active file metadata",
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
            .min(1),
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
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
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

      const result = await completeUpload({
        db,
        env: c.env,
        userId: authResult.user.id,
        tenderId: request.tenderId,
        uploadSessionId: request.uploadSessionId,
        parts: request.parts,
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
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

uploadsEndpoint.openapi(
  {
    method: "post",
    path: "/abort",
    tags: ["uploads"],
    summary: "Abort an active multipart upload session",
    request: {
      headers: ApiKeyHeaderSchema,
      body: jsonContent(
        z.object({
          tenderId: z.string().min(1),
          uploadSessionId: z.string().min(1),
        })
      ),
    },
    responses: {
      200: {
        description: "Upload aborted",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: z.object({ aborted: z.literal(true) }),
            }),
          },
        },
      },
      400: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      401: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      403: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      404: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      409: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
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

      const result = await abortUpload({
        db,
        env: c.env,
        userId: authResult.user.id,
        tenderId: request.tenderId,
        uploadSessionId: request.uploadSessionId,
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          getWriteErrorStatus(result.errorCode)
        );
      }

      return c.json({ ok: true, data: result.data } as const, 200);
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

uploadsEndpoint.openapi(
  {
    method: "get",
    path: "/status",
    tags: ["uploads"],
    summary: "Get current submission status and active uploads for a tender",
    request: {
      headers: ApiKeyHeaderSchema,
      query: z.object({
        tenderId: z.string().min(1),
      }),
    },
    responses: {
      200: {
        description: "Upload status response",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: z.object({
                tenderId: z.string(),
                submission: z.object({
                  status: z.enum(["draft", "submitted"]),
                  submittedAt: z.string().datetime().nullable(),
                }),
                uploads: z.object({
                  q1: UploadedFileSummarySchema.nullable(),
                  q2: UploadedFileSummarySchema.nullable(),
                  q3: UploadedFileSummarySchema.nullable(),
                  q4: UploadedFileSummarySchema.nullable(),
                  q5: UploadedFileSummarySchema.nullable(),
                }),
              }),
            }),
          },
        },
      },
      400: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      401: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      403: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      404: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const apiKey = c.req.valid("header")["x-api-key"];
      const request = c.req.valid("query");

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

      const result = await getUploadStatus({
        db,
        userId: authResult.user.id,
        tenderId: request.tenderId,
      });
      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          getReadErrorStatus(result.errorCode)
        );
      }

      return c.json(
        {
          ok: true,
          data: {
            ...result.data,
            submission: {
              ...result.data.submission,
              submittedAt: result.data.submission.submittedAt
                ? result.data.submission.submittedAt.toISOString()
                : null,
            },
            uploads: {
              q1: result.data.uploads.q1
                ? {
                    ...result.data.uploads.q1,
                    uploadedAt: result.data.uploads.q1.uploadedAt.toISOString(),
                  }
                : null,
              q2: result.data.uploads.q2
                ? {
                    ...result.data.uploads.q2,
                    uploadedAt: result.data.uploads.q2.uploadedAt.toISOString(),
                  }
                : null,
              q3: result.data.uploads.q3
                ? {
                    ...result.data.uploads.q3,
                    uploadedAt: result.data.uploads.q3.uploadedAt.toISOString(),
                  }
                : null,
              q4: result.data.uploads.q4
                ? {
                    ...result.data.uploads.q4,
                    uploadedAt: result.data.uploads.q4.uploadedAt.toISOString(),
                  }
                : null,
              q5: result.data.uploads.q5
                ? {
                    ...result.data.uploads.q5,
                    uploadedAt: result.data.uploads.q5.uploadedAt.toISOString(),
                  }
                : null,
            },
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
