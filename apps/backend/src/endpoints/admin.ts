import { z } from "@hono/zod-openapi";
import { getUserFromApiKey } from "../features/auth";
import {
  grantAdminPrivileges,
  listAdminUsers,
  listSubmittedApplications,
  removeAdminPrivileges,
} from "../features/admin";
import { AdminRoleName } from "../features/adminConstants";
import { connectDb } from "../features/db/connect";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

export const adminEndpoint = getHono();

type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; errorCode: ErrorCodes; error: string; status: 401 | 403 };

async function getAdminUserFromApiKey({
  apiKey,
  env,
}: {
  apiKey: string;
  env: Env;
}): Promise<AdminAuthResult> {
  const db = connectDb({ env });
  const userResult = await getUserFromApiKey({ apiKey, db, env });

  if (!userResult.ok) {
    return {
      ok: false,
      errorCode: userResult.errorCode,
      error: userResult.error,
      status: 401,
    } as const;
  }

  const hasAdminRole = userResult.user.roles.some(
    (role) => role.roleName === AdminRoleName
  );

  if (!hasAdminRole) {
    return {
      ok: false,
      errorCode: ErrorCodes.USER_DOES_NOT_HAVE_ROLE,
      error: "User does not have required role",
      status: 403,
    } as const;
  }

  return {
    ok: true,
    userId: userResult.user.id,
  } as const;
}

function toAdminErrorStatus(errorCode: ErrorCodes): 400 | 403 | 404 {
  switch (errorCode) {
    case ErrorCodes.USER_DOES_NOT_HAVE_ROLE:
      return 403;
    case ErrorCodes.USER_NOT_FOUND:
    case ErrorCodes.ROLE_NOT_FOUND:
      return 404;
    default:
      return 400;
  }
}

adminEndpoint.openapi(
  {
    method: "get",
    path: "/applications/submitted",
    tags: ["admin"],
    summary: "List submitted applications with applicant details and R2 folder URL",
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
                applications: z.array(
                  z.object({
                    applicationId: z.string(),
                    applicantEmail: z.string().email(),
                    applicantFirmName: z.string().nullable(),
                    applicantName: z.string().nullable(),
                    applicantPhoneNumber: z.string().nullable(),
                    submittedAt: z.string().datetime(),
                    status: z.literal("submitted"),
                    r2FolderUrl: z.string().url(),
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
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
    },
  },
  async (c) => {
    try {
      const apiKey = c.req.valid("header")["x-api-key"];
      const authResult = await getAdminUserFromApiKey({ apiKey, env: c.env });

      if (!authResult.ok) {
        return c.json(
          {
            ok: false,
            errorCode: authResult.errorCode,
            error: authResult.error,
          } as const,
          authResult.status
        );
      }

      const db = connectDb({ env: c.env });
      const result = await listSubmittedApplications({ db, env: c.env });
      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: "INTERNAL_ERROR",
            error: result.error,
          } as const,
          500
        );
      }

      return c.json(
        {
          ok: true,
          data: {
            applications: result.data.applications.map((application) => ({
              ...application,
              submittedAt: application.submittedAt.toISOString(),
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

adminEndpoint.openapi(
  {
    method: "get",
    path: "/users",
    tags: ["admin"],
    summary: "List active admin users",
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
              data: z.array(
                z.object({
                  id: z.string(),
                  email: z.string().email(),
                  name: z.string().nullable(),
                })
              ),
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
      const apiKey = c.req.valid("header")["x-api-key"];
      const authResult = await getAdminUserFromApiKey({ apiKey, env: c.env });

      if (!authResult.ok) {
        return c.json(
          {
            ok: false,
            errorCode: authResult.errorCode,
            error: authResult.error,
          } as const,
          authResult.status
        );
      }

      const db = connectDb({ env: c.env });
      const result = await listAdminUsers({ db, env: c.env });
      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          toAdminErrorStatus(result.errorCode)
        );
      }

      return c.json(
        {
          ok: true,
          data: result.data,
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

adminEndpoint.openapi(
  {
    method: "post",
    path: "/users",
    tags: ["admin"],
    summary: "Grant admin role to user by email",
    request: {
      headers: ApiKeyHeaderSchema,
      body: jsonContent(
        z.object({
          email: z.string().email(),
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
                id: z.string(),
                email: z.string().email(),
                name: z.string().nullable(),
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
      const apiKey = c.req.valid("header")["x-api-key"];
      const authResult = await getAdminUserFromApiKey({ apiKey, env: c.env });

      if (!authResult.ok) {
        return c.json(
          {
            ok: false,
            errorCode: authResult.errorCode,
            error: authResult.error,
          } as const,
          authResult.status
        );
      }

      const { email } = c.req.valid("json");
      const db = connectDb({ env: c.env });
      const result = await grantAdminPrivileges({
        db,
        env: c.env,
        email,
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          toAdminErrorStatus(result.errorCode)
        );
      }

      return c.json(
        {
          ok: true,
          data: result.data,
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

adminEndpoint.openapi(
  {
    method: "post",
    path: "/users/{userId}/remove",
    tags: ["admin"],
    summary: "Remove admin role from user",
    request: {
      headers: ApiKeyHeaderSchema,
      params: z.object({
        userId: z.string().min(1),
      }),
    },
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": {
            schema: z.object({
              ok: z.literal(true),
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
      const apiKey = c.req.valid("header")["x-api-key"];
      const authResult = await getAdminUserFromApiKey({ apiKey, env: c.env });

      if (!authResult.ok) {
        return c.json(
          {
            ok: false,
            errorCode: authResult.errorCode,
            error: authResult.error,
          } as const,
          authResult.status
        );
      }

      const { userId } = c.req.valid("param");
      const db = connectDb({ env: c.env });
      const result = await removeAdminPrivileges({
        db,
        env: c.env,
        userId,
      });

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            errorCode: result.errorCode,
            error: result.error,
          } as const,
          toAdminErrorStatus(result.errorCode)
        );
      }

      return c.json({ ok: true } as const, 200);
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
