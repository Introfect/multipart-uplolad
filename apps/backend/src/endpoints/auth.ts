import {
  getOpenApiClientErrorResponse,
  jsonContent,
  getOpenapiResponse,
  getAuthOpenApiResponse,
  ApiKeyHeaderSchema,
} from "../utils/openapi";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import { z } from "@hono/zod-openapi";
import { connectDb } from "../features/db/connect";
import {
  createUser,
  getUserByEmail,
  getRoleByName,
  assignRoleToUser,
} from "../features/user";
import {
  createApiKey,
  getUserFromApiKey,
  verifyPassword,
} from "../features/auth";

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
        description: "Successful Response",
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
        errorCodesSchema: z.literal("INTERNAL_ERROR" as const),
      }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const { email, password } = c.req.valid("json");

      const existingUser = await getUserByEmail({ email, db });

      if (!existingUser) {
        const userRes = await createUser({ email, password, db });

        if (!userRes.ok) {
          return c.json(
            {
              ok: false,
              errorCode: ErrorCodes.INVALID_INPUT as typeof ErrorCodes.INVALID_INPUT,
              error: userRes.error,
            } as const,
            400
          );
        }

        const role = await getRoleByName({ name: "applicant", db });

        if (!role) {
          return c.json(
            {
              ok: false,
              errorCode: "INTERNAL_ERROR" as const,
              error: "Default role not found - server misconfiguration",
            } as const,
            500
          );
        }

        await assignRoleToUser({
          userId: userRes.userId,
          roleId: role.id,
          db,
        });

        const apiKey = await createApiKey({
          env: c.env,
          userId: userRes.userId,
        });

        return c.json(
          { ok: true, data: { apiKey, isNewUser: true } } as const,
          200
        );
      }

      const isPasswordValid = await verifyPassword(
        password,
        existingUser.passwordHash
      );

      if (!isPasswordValid) {
        return c.json(
          {
            ok: false,
            errorCode: ErrorCodes.INVALID_CREDENTIALS as typeof ErrorCodes.INVALID_CREDENTIALS,
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
        { ok: true, data: { apiKey, isNewUser: false } } as const,
        200
      );
    } catch (err) {
      return handleApiErrors(c, err);
    }
  }
);

authEndpoint.openapi(
  {
    method: "get",
    path: "/me",
    tags: ["auth"],
    summary: "Get current user profile with roles",
    responses: {
      200: {
        description: "Successful Response",
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
        errorCodesSchema: z.literal("INTERNAL_ERROR" as const),
      }),
    },
    request: {
      headers: ApiKeyHeaderSchema,
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const apiKey = c.req.valid("header")["x-api-key"];

      const userRes = await getUserFromApiKey({ apiKey, db, env: c.env });

      if (!userRes.ok) {
        return c.json(
          {
            ok: false,
            errorCode: userRes.errorCode as
              | typeof ErrorCodes.INVALID_API_KEY
              | typeof ErrorCodes.USER_NOT_FOUND,
            error: userRes.error,
          } as const,
          401
        );
      }

      return c.json({ ok: true, data: userRes.user } as const, 200);
    } catch (err) {
      return handleApiErrors(c, err);
    }
  }
);
