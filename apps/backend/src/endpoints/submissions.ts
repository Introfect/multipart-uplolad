import { z } from "@hono/zod-openapi";
import { getUserFromApiKeyWithRole } from "../features/auth";
import { connectDb } from "../features/db/connect";
import { submitTender } from "../features/uploads";
import { UploadAllowedRoleName } from "../features/uploadConstants";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

export const submissionsEndpoint = getHono();

type SubmitErrorStatus = 400 | 403 | 404;

function getSubmitErrorStatus(errorCode: ErrorCodes): SubmitErrorStatus {
  switch (errorCode) {
    case ErrorCodes.FORBIDDEN_ROLE:
    case ErrorCodes.SUBMISSION_ALREADY_SUBMITTED:
      return 403;
    case ErrorCodes.TENDER_NOT_FOUND:
    case ErrorCodes.SUBMISSION_NOT_FOUND:
      return 404;
    default:
      return 400;
  }
}

submissionsEndpoint.openapi(
  {
    method: "post",
    path: "/submit",
    tags: ["submissions"],
    summary: "Validate required uploads and submit tender",
    request: {
      headers: ApiKeyHeaderSchema,
      body: jsonContent(
        z.object({
          tenderId: z.string().min(1),
        })
      ),
    },
    responses: {
      200: {
        description: "Tender submitted",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: z.object({
                tenderId: z.string(),
                status: z.literal("submitted"),
                submittedAt: z.string().datetime(),
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

      const result = await submitTender({
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
          getSubmitErrorStatus(result.errorCode)
        );
      }

      return c.json(
        {
          ok: true,
          data: {
            ...result.data,
            submittedAt: result.data.submittedAt.toISOString(),
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
