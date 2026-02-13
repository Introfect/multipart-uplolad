import { WithDbAndEnv, WithEnv } from "../utils/commonTypes";
import * as jwt from "@tsndr/cloudflare-worker-jwt";
import { ErrorCodes } from "../utils/error";
import { getUserByEmail, getUserByIdWithRoles } from "./user";
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function createApiKey({
  env,
  userId,
}: WithEnv<{ userId: string }>): Promise<string> {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
  };

  return await jwt.sign(payload, env.JWT_SECRET);
}

export async function verifyApiKey({
  env,
  apiKey,
}: WithEnv<{ apiKey: string }>): Promise<{ ok: true; userId: string } | { ok: false }> {
  const isValid = await jwt.verify(apiKey, env.JWT_SECRET);

  if (!isValid) {
    return { ok: false } as const;
  }

  const decoded = jwt.decode(apiKey);
  const userId = decoded.payload?.sub;

  if (typeof userId !== "string") {
    return { ok: false } as const;
  }

  return { ok: true, userId } as const;
}

type UserWithRoles = {
  id: string;
  email: string;
  firmName: string | null;
  name: string | null;
  phoneNumber: string | null;
  roles: Array<{ roleId: string; roleName: string }>;
};

type AuthResult =
  | { ok: true; user: UserWithRoles }
  | { ok: false; errorCode: ErrorCodes; error: string };

export async function getUserFromApiKey({
  apiKey,
  db,
  env,
}: WithDbAndEnv<{ apiKey: string }>): Promise<AuthResult> {
  const verification = await verifyApiKey({ env, apiKey });

  if (!verification.ok) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_API_KEY,
      error: "Invalid API key",
    } as const;
  }

  const user = await getUserByIdWithRoles({ id: verification.userId, db });

  if (!user) {
    return {
      ok: false,
      errorCode: ErrorCodes.USER_NOT_FOUND,
      error: "User not found",
    } as const;
  }

  return {
    ok: true,
    user,
  } as const;
}
