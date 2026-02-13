import { createCookie } from "react-router";
import type { AppLoadContext } from "react-router";

const AUTH_COOKIE_NAME = "mist_api_key";
const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const authCookie = createCookie(AUTH_COOKIE_NAME, {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
});

export type AuthUser = {
  id: string;
  email: string;
  firmName: string | null;
  name: string | null;
  phoneNumber: string | null;
  roles: Array<{ roleId: string; roleName: string }>;
};

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  errorCode?: string;
  error: string;
};

function getBackendBaseUrl(context: AppLoadContext): string {
  const env = context.cloudflare?.env as unknown as Record<string, unknown> | undefined;
  const configured =
    typeof env?.BACKEND_API_URL === "string" ? env.BACKEND_API_URL.trim() : "";

  if (configured.length > 0) {
    return configured.replace(/\/+$/, "");
  }

  return "http://127.0.0.1:8787";
}

async function fetchBackendJson<T>({
  context,
  path,
  init,
}: {
  context: AppLoadContext;
  path: string;
  init?: RequestInit;
}): Promise<
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; error: string; errorCode?: string }
> {
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

  if (!response.ok || !payload || payload.ok === false) {
    const textFallback =
      responseText.trim().length > 0
        ? responseText.trim().slice(0, 180)
        : "";

    return {
      ok: false,
      status: response.status,
      error:
        payload && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : textFallback || `Request failed (status ${response.status})`,
      errorCode: payload && "errorCode" in payload ? payload.errorCode : undefined,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload.data,
  };
}

export async function getApiKeyFromRequest(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  const parsed = await authCookie.parse(cookieHeader);
  return typeof parsed === "string" && parsed.length > 0 ? parsed : null;
}

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export async function setApiKeyCookie({
  apiKey,
  request,
}: {
  apiKey: string;
  request: Request;
}): Promise<string> {
  return authCookie.serialize(apiKey, { secure: isSecureRequest(request) });
}

export async function clearApiKeyCookie(request: Request): Promise<string> {
  return authCookie.serialize("", {
    maxAge: 0,
    secure: isSecureRequest(request),
  });
}

export function isUserOnboarded(user: AuthUser): boolean {
  return Boolean(
    user.name?.trim() && user.firmName?.trim() && user.phoneNumber?.trim()
  );
}

export async function loginWithPassword({
  context,
  email,
  password,
}: {
  context: AppLoadContext;
  email: string;
  password: string;
}) {
  return fetchBackendJson<{ apiKey: string; isNewUser: boolean }>({
    context,
    path: "/api/v1/auth/login",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  });
}

export async function fetchMe({
  context,
  apiKey,
}: {
  context: AppLoadContext;
  apiKey: string;
}) {
  return fetchBackendJson<AuthUser>({
    context,
    path: "/api/v1/auth/me",
    init: {
      method: "GET",
      headers: { "x-api-key": apiKey },
    },
  });
}

export async function submitOnboarding({
  context,
  apiKey,
  name,
  firmName,
  phoneNumber,
}: {
  context: AppLoadContext;
  apiKey: string;
  name: string;
  firmName: string;
  phoneNumber: string;
}) {
  return fetchBackendJson<Record<string, never>>({
    context,
    path: "/api/v1/user/onboard",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ name, firmName, phoneNumber }),
    },
  });
}
