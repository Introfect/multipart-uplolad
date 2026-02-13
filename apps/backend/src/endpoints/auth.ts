import { z } from "@hono/zod-openapi";
import { connectDb } from "../features/db/connect";
import {
  assignRoleToUser,
  createUser,
  getRoleByName,
  getUserByEmail,
} from "../features/user";
import { createApiKey, getUserFromApiKey, verifyPassword } from "../features/auth";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

export const authEndpoint = getHono();

authEndpoint.openapi(
  {
    method: "post",
    path: "/login",
    tags: ["auth"],
    summary: "Register new user or login existing user",
    request: {
      body: jsonContent(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
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
                apiKey: z.string(),
                isNewUser: z.boolean(),
              }),
            }),
          },
        },
      },
      400: getOpenApiClientErrorResponse({
        errorCodesSchema: z.enum([ErrorCodes.INVALID_INPUT]),
      }),
      401: getOpenApiClientErrorResponse({
        errorCodesSchema: z.enum([ErrorCodes.INVALID_CREDENTIALS]),
      }),
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const { email, password } = c.req.valid("json");

      const existingUser = await getUserByEmail({ email, db });

      if (!existingUser) {
        const userResult = await createUser({ email, password, db });
        if (!userResult.ok) {
          return c.json(
            {
              ok: false,
              errorCode: ErrorCodes.INVALID_INPUT,
              error: userResult.error,
            } as const,
            400
          );
        }

        const applicantRole = await getRoleByName({ name: "applicant", db });
        if (!applicantRole) {
          return c.json(
            {
              ok: false,
              errorCode: "INTERNAL_ERROR",
              error: "Default role not found",
            } as const,
            500
          );
        }

        const assignResult = await assignRoleToUser({
          userId: userResult.userId,
          roleId: applicantRole.id,
          db,
        });
        if (!assignResult.ok) {
          return c.json(
            {
              ok: false,
              errorCode: "INTERNAL_ERROR",
              error: assignResult.error,
            } as const,
            500
          );
        }

        const apiKey = await createApiKey({
          env: c.env,
          userId: userResult.userId,
        });

        return c.json(
          {
            ok: true,
            data: {
              apiKey,
              isNewUser: true,
            },
          } as const,
          200
        );
      }

      const isPasswordValid = await verifyPassword(password, existingUser.passwordHash);
      if (!isPasswordValid) {
        return c.json(
          {
            ok: false,
            errorCode: ErrorCodes.INVALID_CREDENTIALS,
            error: "Invalid email or password",
          } as const,
          401
        );
      }

      const apiKey = await createApiKey({
        env: c.env,
        userId: existingUser.id,
      });

      return c.json(
        {
          ok: true,
          data: {
            apiKey,
            isNewUser: false,
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

authEndpoint.openapi(
  {
    method: "get",
    path: "/me",
    tags: ["auth"],
    summary: "Get current user profile with roles",
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
                id: z.string(),
                email: z.string(),
                firmName: z.string().nullable(),
                name: z.string().nullable(),
                phoneNumber: z.string().nullable(),
                roles: z.array(
                  z.object({
                    roleId: z.string(),
                    roleName: z.string(),
                  })
                ),
              }),
            }),
          },
        },
      },
      401: getOpenApiClientErrorResponse({
        errorCodesSchema: z.enum([
          ErrorCodes.INVALID_API_KEY,
          ErrorCodes.USER_NOT_FOUND,
        ]),
      }),
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const apiKey = c.req.valid("header")["x-api-key"];

      const authResult = await getUserFromApiKey({ apiKey, db, env: c.env });
      if (!authResult.ok) {
        if (
          authResult.errorCode !== ErrorCodes.INVALID_API_KEY &&
          authResult.errorCode !== ErrorCodes.USER_NOT_FOUND
        ) {
          return c.json(
            {
              ok: false,
              errorCode: "INTERNAL_ERROR",
              error: authResult.error,
            } as const,
            500
          );
        }

        return c.json(
          {
            ok: false,
            errorCode: authResult.errorCode,
            error: authResult.error,
          } as const,
          401
        );
      }

      return c.json(
        {
          ok: true,
          data: authResult.user,
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
