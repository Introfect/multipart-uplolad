import { Context } from "hono";

export async function handleApiErrors(c: Context, err: unknown) {
  console.error("API Error:", err);
  if (err instanceof Error) {
    return c.json(
      {
        ok: false,
        errorCode: "INTERNAL_ERROR" as const,
        error: err.message,
      } as const,
      500
    );
  }

  return c.json(
    {
      ok: false,
      errorCode: "INTERNAL_ERROR" as const,
      error: "Internal server error",
    } as const,
    500
  );
}

export const ErrorCodes = {
  INVALID_API_KEY: "INVALID_API_KEY",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
} as const;

export type ErrorCodes = (typeof ErrorCodes)[keyof typeof ErrorCodes];
