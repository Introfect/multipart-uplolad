import type { AppLoadContext } from "react-router";

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type ApiFailure = {
  ok: false;
  errorCode?: string;
  error: string;
  debug?: JsonValue;
};

export type BackendJsonResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; error: string; errorCode?: string; debug?: JsonValue };

export function getBackendBaseUrl(context: AppLoadContext): string {
  const env = context.cloudflare?.env as unknown as Record<string, unknown> | undefined;
  const configured =
    typeof env?.BACKEND_API_URL === "string" ? env.BACKEND_API_URL.trim() : "";

  if (configured.length > 0) {
    return configured.replace(/\/+$/, "");
  }

  return "http://127.0.0.1:8787";
}

export async function fetchBackendJson<T>({
  context,
  path,
  init,
}: {
  context: AppLoadContext;
  path: string;
  init?: RequestInit;
}): Promise<BackendJsonResult<T>> {
  const baseUrl = getBackendBaseUrl(context);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return {
      ok: false,
      status: 503,
      error: `Cannot reach backend at ${baseUrl}: ${message}`,
    };
  }

  const responseText = await response.text();
  let payload: ApiSuccess<T> | ApiFailure | null = null;

  if (responseText.length > 0) {
    try {
      payload = JSON.parse(responseText) as ApiSuccess<T> | ApiFailure;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload === null || payload.ok === false) {
    const textFallback =
      responseText.trim().length > 0 ? responseText.trim().slice(0, 180) : "";

    return {
      ok: false,
      status: response.status,
      error:
        payload && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : textFallback || `Request failed (status ${response.status})`,
      errorCode: payload && "errorCode" in payload ? payload.errorCode : undefined,
      debug: payload && "debug" in payload ? payload.debug : undefined,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload.data,
  };
}
