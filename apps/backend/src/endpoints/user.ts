import {
  getOpenApiClientErrorResponse,
  jsonContent,
  getOpenapiResponse,
  ApiKeyHeaderSchema,
} from "../utils/openapi";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import { z } from "@hono/zod-openapi";
import { connectDb } from "../features/db/connect";
import { onboardUser } from "../features/user";
import { getUserFromApiKey } from "../features/auth";

export const userEndpoint = getHono();

userEndpoint.openapi(
  {
    method: "post",
    path: "/onboard",
    tags: ["user"],
    summary: "Update user profile information",
    request: {
      headers: ApiKeyHeaderSchema,
      body: jsonContent(
        z.object({
          firmName: z.string().min(1),
          name: z.string().min(1),
          phoneNumber: z.string().min(1),
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
      404: getOpenApiClientErrorResponse({
        errorCodesSchema: z.enum([ErrorCodes.USER_NOT_FOUND]),
      }),
      500: getOpenApiClientErrorResponse({
        errorCodesSchema: z.literal("INTERNAL_ERROR" as const),
      }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const apiKey = c.req.valid("header")["x-api-key"];
      const { firmName, name, phoneNumber } = c.req.valid("json");

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

      const onboardRes = await onboardUser({
        userId: userRes.user.id,
        firmName,
        name,
        phoneNumber,
        db,
      });

      if (!onboardRes.ok) {
        return c.json(
          {
            ok: false,
            errorCode: onboardRes.errorCode as typeof ErrorCodes.USER_NOT_FOUND,
            error: onboardRes.error,
          } as const,
          404
        );
      }

      return c.json({ ok: true } as const, 200);
    } catch (err) {
      return handleApiErrors(c, err);
    }
  }
);
