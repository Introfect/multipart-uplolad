import { WithDb } from "../utils/commonTypes";
import { UserTable, RoleTable, UserRoleTable } from "./db/schema";
import { eq, and } from "drizzle-orm";
import { ErrorCodes } from "../utils/error";
import { hashPassword, verifyPassword } from "./auth";

export async function createUser({
  email,
  password,
  db,
}: WithDb<{
  email: string;
  password: string;
}>): Promise<
  | { ok: true; userId: string }
  | { ok: false; errorCode: ErrorCodes; error: string }
> {
  const trimmedEmail = email.trim().toLowerCase();
  const hashedPassword = await hashPassword(password);

  const users = await db
    .insert(UserTable)
    .values({
      email: trimmedEmail,
      passwordHash: hashedPassword,
    })
    .returning({ id: UserTable.id });

  if (users.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Failed to create user",
    } as const;
  }

  return { ok: true, userId: users[0].id } as const;
}

export async function getUserByEmail({
  email,
  db,
}: WithDb<{ email: string }>) {
  const trimmedEmail = email.trim().toLowerCase();

  const users = await db
    .select({
      id: UserTable.id,
      email: UserTable.email,
      passwordHash: UserTable.passwordHash,
    })
    .from(UserTable)
    .where(and(eq(UserTable.email, trimmedEmail), eq(UserTable.isActive, true)));

  if (users.length === 0) {
    return null;
  }

  return users[0];
}

export async function getUserByIdWithRoles({
  id,
  db,
}: WithDb<{ id: string }>) {
  const users = await db
    .select({
      id: UserTable.id,
      email: UserTable.email,
      firmName: UserTable.firmName,
      name: UserTable.name,
      phoneNumber: UserTable.phoneNumber,
    })
    .from(UserTable)
    .where(and(eq(UserTable.id, id), eq(UserTable.isActive, true)));

  if (users.length === 0) {
    return null;
  }

  const user = users[0];

  const userRoles = await db
    .select({
      roleId: UserRoleTable.roleId,
      roleName: RoleTable.name,
    })
    .from(UserRoleTable)
    .innerJoin(RoleTable, eq(UserRoleTable.roleId, RoleTable.id))
    .where(
      and(
        eq(UserRoleTable.userId, user.id),
        eq(UserRoleTable.isActive, true),
        eq(RoleTable.isActive, true)
      )
    );

  return {
    ...user,
    roles: userRoles,
  };
}

export async function getRoleByName({
  name,
  db,
}: WithDb<{ name: string }>): Promise<{ id: string; name: string } | null> {
  const roles = await db
    .select({
      id: RoleTable.id,
      name: RoleTable.name,
    })
    .from(RoleTable)
    .where(and(eq(RoleTable.name, name), eq(RoleTable.isActive, true)));

  if (roles.length === 0) {
    return null;
  }

  return roles[0];
}

export async function assignRoleToUser({
  userId,
  roleId,
  db,
}: WithDb<{ userId: string; roleId: string }>): Promise<
  { ok: true } | { ok: false; errorCode: ErrorCodes; error: string }
> {
  const result = await db
    .insert(UserRoleTable)
    .values({
      userId,
      roleId,
    })
    .returning({ id: UserRoleTable.id });

  if (result.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Failed to assign role",
    } as const;
  }

  return { ok: true } as const;
}

export async function onboardUser({
  userId,
  firmName,
  name,
  phoneNumber,
  db,
}: WithDb<{
  userId: string;
  firmName: string;
  name: string;
  phoneNumber: string;
}>): Promise<
  { ok: true } | { ok: false; errorCode: ErrorCodes; error: string }
> {
  const result = await db
    .update(UserTable)
    .set({
      firmName,
      name,
      phoneNumber,
      updatedAt: new Date(),
    })
    .where(and(eq(UserTable.id, userId), eq(UserTable.isActive, true)))
    .returning({ id: UserTable.id });

  if (result.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.USER_NOT_FOUND,
      error: "User not found",
    } as const;
  }

  return { ok: true } as const;
}
