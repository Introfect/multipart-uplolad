import { z } from "@hono/zod-openapi";
import { getUserFromApiKeyWithRole } from "../features/auth";
import { getApplicationState, updateApplicationState } from "../features/applicationState";
import { connectDb } from "../features/db/connect";
import { UploadAllowedRoleName } from "../features/uploadConstants";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

export const applicationStateEndpoint = getHono();

const PersistedFormStateSchema = z.object({
  version: z.literal(1),
  singleUploads: z
    .record(
      z.string(),
      z.object({
        fileId: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string().optional(),
        completedAt: z.string(),
      })
    )
    .optional(),
  multiUploads: z
    .record(
      z.string(),
      z.array(
        z.object({
          key: z.string(),
          fileId: z.string(),
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string().optional(),
          completedAt: z.string(),
        })
      )
    )
    .optional(),
});

// GET /api/v1/application/{submissionId}/state
applicationStateEndpoint.openapi(
  {
    method: "get",
    path: "/application/{submissionId}/state",
    tags: ["application-state"],
    summary: "Get persisted form state for a submission",
    request: {
      headers: ApiKeyHeaderSchema,
      params: z.object({
        submissionId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Application state retrieved",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: PersistedFormStateSchema,
            }),
          },
        },
      },
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
      const { submissionId } = c.req.valid("param");
      const apiKey = c.req.valid("header")["x-api-key"];

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

      const result = await getApplicationState({
        env: c.env,
        db,
        submissionId,
        userId: authResult.user.id,
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          404
        );
      }

      return c.json({ ok: true, data: result.data });
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

// POST /api/v1/application/{submissionId}/state
applicationStateEndpoint.openapi(
  {
    method: "post",
    path: "/application/{submissionId}/state",
    tags: ["application-state"],
    summary: "Save or update persisted form state for a submission",
    request: {
      headers: ApiKeyHeaderSchema,
      params: z.object({
        submissionId: z.string(),
      }),
      body: jsonContent(
        z.object({
          data: PersistedFormStateSchema,
        }),
        "Form state data"
      ),
    },
    responses: {
      200: {
        description: "State saved successfully",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: z.object({ id: z.string() }),
            }),
          },
        },
      },
      401: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      403: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const { submissionId } = c.req.valid("param");
      const { data } = c.req.valid("json");
      const apiKey = c.req.valid("header")["x-api-key"];

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

      const result = await updateApplicationState({
        env: c.env,
        db,
        submissionId,
        userId: authResult.user.id,
        data,
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          500
        );
      }

      return c.json({ ok: true, data: result.data });
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
