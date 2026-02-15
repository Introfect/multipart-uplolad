import { z } from "@hono/zod-openapi";
import { getUserFromApiKeyWithRole } from "../features/auth";
import { applyToTender, listApplicationsForUser } from "../features/applications";
import { connectDb } from "../features/db/connect";
import { UploadAllowedRoleName } from "../features/uploadConstants";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

export const applicationsEndpoint = getHono();

const TenderSummarySchema = z.object({
  tenderId: z.string(),
  title: z.string(),
  firstDateToApply: z.string().datetime(),
  lastDateToApply: z.string().datetime(),
});

const ApplicationSummarySchema = z.object({
  applicationId: z.string(),
  tenderId: z.string(),
  tenderTitle: z.string(),
  status: z.enum(["draft", "submitted"]),
  submittedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  firstDateToApply: z.string().datetime(),
  lastDateToApply: z.string().datetime(),
});

type ApplyErrorStatus = 400 | 403 | 404;

function getApplyErrorStatus(errorCode: ErrorCodes): ApplyErrorStatus {
  switch (errorCode) {
    case ErrorCodes.FORBIDDEN_ROLE:
    case ErrorCodes.TENDER_NOT_OPEN_FOR_APPLICATIONS:
      return 403;
    case ErrorCodes.TENDER_NOT_FOUND:
      return 404;
    default:
      return 400;
  }
}

applicationsEndpoint.openapi(
  {
    method: "get",
    path: "/applications",
    tags: ["applications"],
    summary: "List current user's applications or active tenders when no applications exist",
    request: {
      headers: ApiKeyHeaderSchema,
    },
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: z.object({
                applications: z.array(ApplicationSummarySchema),
                tenders: z.array(TenderSummarySchema),
              }),
            }),
          },
        },
      },
      400: getOpenApiClientErrorResponse({ errorCodesSchema: z.string() }),
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

      const result = await listApplicationsForUser({
        db,
        userId: authResult.user.id,
        now: new Date(),
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          400
        );
      }

      return c.json(
        {
          ok: true,
          data: {
            applications: result.data.applications.map((application) => ({
              applicationId: application.applicationId,
              tenderId: application.tenderId,
              tenderTitle: application.tenderTitle,
              status: application.status,
              submittedAt:
                application.submittedAt === null
                  ? null
                  : application.submittedAt.toISOString(),
              createdAt: application.createdAt.toISOString(),
              createdBy: application.createdBy,
              firstDateToApply: application.firstDateToApply.toISOString(),
              lastDateToApply: application.lastDateToApply.toISOString(),
            })),
            tenders: result.data.tenders.map((tender) => ({
              tenderId: tender.tenderId,
              title: tender.title,
              firstDateToApply: tender.firstDateToApply.toISOString(),
              lastDateToApply: tender.lastDateToApply.toISOString(),
            })),
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

applicationsEndpoint.openapi(
  {
    method: "post",
    path: "/applications/apply",
    tags: ["applications"],
    summary: "Apply to a tender for the current user",
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
        description: "Successful response",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
              data: z.object({
                application: ApplicationSummarySchema,
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

      const result = await applyToTender({
        db,
        userId: authResult.user.id,
        tenderId: request.tenderId,
        now: new Date(),
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          getApplyErrorStatus(result.errorCode)
        );
      }

      return c.json(
        {
          ok: true,
          data: {
            application: {
              applicationId: result.data.application.applicationId,
              tenderId: result.data.application.tenderId,
              tenderTitle: result.data.application.tenderTitle,
              status: result.data.application.status,
              submittedAt:
                result.data.application.submittedAt === null
                  ? null
                  : result.data.application.submittedAt.toISOString(),
              createdAt: result.data.application.createdAt.toISOString(),
              createdBy: result.data.application.createdBy,
              firstDateToApply: result.data.application.firstDateToApply.toISOString(),
              lastDateToApply: result.data.application.lastDateToApply.toISOString(),
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
