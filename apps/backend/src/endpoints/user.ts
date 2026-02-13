import { z } from "@hono/zod-openapi";
import { getUserFromApiKey } from "../features/auth";
import { connectDb } from "../features/db/connect";
import { onboardUser } from "../features/user";
import { ErrorCodes, handleApiErrors } from "../utils/error";
import { getHono } from "../utils/hono";
import {
  ApiKeyHeaderSchema,
  getOpenApiClientErrorResponse,
  jsonContent,
} from "../utils/openapi";

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
        description: "Successful response",
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
        errorCodesSchema: z.literal("INTERNAL_ERROR"),
      }),
    },
  },
  async (c) => {
    try {
      const db = connectDb({ env: c.env });
      const apiKey = c.req.valid("header")["x-api-key"];
      const request = c.req.valid("json");

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

      const onboardingResult = await onboardUser({
        db,
        userId: authResult.user.id,
        firmName: request.firmName,
        name: request.name,
        phoneNumber: request.phoneNumber,
      });
      if (!onboardingResult.ok) {
        if (onboardingResult.errorCode !== ErrorCodes.USER_NOT_FOUND) {
          return c.json(
            {
              ok: false,
              errorCode: "INTERNAL_ERROR",
              error: onboardingResult.error,
            } as const,
            500
          );
        }

        return c.json(
          {
            ok: false,
            errorCode: onboardingResult.errorCode,
            error: onboardingResult.error,
          } as const,
          404
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
