import { Context } from "hono";

type ApiErrorInput =
  | Error
  | { message?: string }
  | string
  | number
  | boolean
  | null
  | undefined;

export async function handleApiErrors(c: Context, err: ApiErrorInput) {
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

  if (typeof err === "string" && err.trim().length > 0) {
    return c.json(
      {
        ok: false,
        errorCode: "INTERNAL_ERROR" as const,
        error: err,
      } as const,
      500
    );
  }

  if (typeof err === "object" && err !== null) {
    const message = Reflect.get(err, "message");
    if (typeof message === "string" && message.length > 0) {
      return c.json(
        {
          ok: false,
          errorCode: "INTERNAL_ERROR" as const,
          error: message,
        } as const,
        500
      );
    }
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
  USER_DOES_NOT_HAVE_ROLE: "USER_DOES_NOT_HAVE_ROLE",
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
  FORBIDDEN_ROLE: "FORBIDDEN_ROLE",
  TENDER_NOT_FOUND: "TENDER_NOT_FOUND",
  TENDER_NOT_OPEN_FOR_APPLICATIONS: "TENDER_NOT_OPEN_FOR_APPLICATIONS",
  TENDER_ALREADY_EXISTS: "TENDER_ALREADY_EXISTS",
  SUBMISSION_NOT_FOUND: "SUBMISSION_NOT_FOUND",
  SUBMISSION_ALREADY_SUBMITTED: "SUBMISSION_ALREADY_SUBMITTED",
  UPLOAD_CONFLICT: "UPLOAD_CONFLICT",
  UPLOAD_SESSION_NOT_FOUND: "UPLOAD_SESSION_NOT_FOUND",
  UPLOAD_SESSION_EXPIRED: "UPLOAD_SESSION_EXPIRED",
  UPLOAD_SESSION_STATE_INVALID: "UPLOAD_SESSION_STATE_INVALID",
  UPLOAD_PROVIDER_UNAVAILABLE: "UPLOAD_PROVIDER_UNAVAILABLE",
  UPLOAD_CONFIG_INVALID: "UPLOAD_CONFIG_INVALID",
  PARTS_MISMATCH: "PARTS_MISMATCH",
  MISSING_REQUIRED_UPLOADS: "MISSING_REQUIRED_UPLOADS",
  APPLICATION_STATE_NOT_FOUND: "APPLICATION_STATE_NOT_FOUND",
} as const;

export type ErrorCodes = (typeof ErrorCodes)[keyof typeof ErrorCodes];
