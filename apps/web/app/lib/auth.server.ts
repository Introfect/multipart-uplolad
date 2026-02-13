import { createCookie } from "react-router";
import type { AppLoadContext } from "react-router";
import { fetchBackendJson } from "./backend-api.server";

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
