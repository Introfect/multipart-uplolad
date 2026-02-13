import { and, asc, desc, eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import {
  RoleTable,
  SubmissionStatuses,
  SubmissionTable,
  TenderTable,
  UserRoleTable,
  UserTable,
} from "./db/schema";
import { ErrorCodes } from "../utils/error";
import { WithDbAndEnv } from "../utils/commonTypes";
import { AdminRoleName } from "./adminConstants";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: ErrorCodes; error: string };

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
};

type SubmittedApplication = {
  applicationId: string;
  applicantEmail: string;
  applicantFirmName: string | null;
  applicantName: string | null;
  applicantPhoneNumber: string | null;
  submittedAt: Date;
  status: "submitted";
  r2FolderUrl: string;
};

function getR2PublicBaseUrl({
  env,
}: {
  env: Env;
}): string {
  const configured = env.R2_PUBLIC_BASE_URL.trim();
  if (configured.length > 0) {
    return configured.replace(/\/+$/, "");
  }

  return `https://${env.R2_BUCKET}.r2.dev`;
}

function getR2FolderUrl({
  env,
  applicationId,
}: {
  env: Env;
  applicationId: string;
}): string {
  return `${getR2PublicBaseUrl({ env })}/${applicationId}/`;
}

async function getRoleByName({
  db,
  roleName,
}: WithDbAndEnv<{ roleName: string }>): Promise<{ id: string } | null> {
  const roles = await db
    .select({
      id: RoleTable.id,
    })
    .from(RoleTable)
    .where(and(eq(RoleTable.name, roleName), eq(RoleTable.isActive, true)));

  if (roles.length === 0) {
    return null;
  }

  return roles[0];
}

export async function listSubmittedApplications({
  db,
  env,
}: WithDbAndEnv<{}>): Promise<Result<{ applications: SubmittedApplication[] }>> {
  const submissions = await db
    .select({
      applicationId: SubmissionTable.id,
      applicantEmail: UserTable.email,
      applicantFirmName: UserTable.firmName,
      applicantName: UserTable.name,
      applicantPhoneNumber: UserTable.phoneNumber,
      submittedAt: SubmissionTable.submittedAt,
      status: SubmissionTable.status,
    })
    .from(SubmissionTable)
    .innerJoin(UserTable, eq(SubmissionTable.userId, UserTable.id))
    .where(
      and(
        eq(SubmissionTable.status, SubmissionStatuses.SUBMITTED),
        eq(SubmissionTable.isActive, true),
        eq(UserTable.isActive, true)
      )
    )
    .orderBy(desc(SubmissionTable.submittedAt));

  const applications: SubmittedApplication[] = [];

  for (const submission of submissions) {
    if (submission.submittedAt === null) {
      continue;
    }

    applications.push({
      applicationId: submission.applicationId,
      applicantEmail: submission.applicantEmail,
      applicantFirmName: submission.applicantFirmName,
      applicantName: submission.applicantName,
      applicantPhoneNumber: submission.applicantPhoneNumber,
      submittedAt: submission.submittedAt,
      status: "submitted",
      r2FolderUrl: getR2FolderUrl({
        env,
        applicationId: submission.applicationId,
      }),
    });
  }

  return {
    ok: true,
    data: { applications },
  } as const;
}

export async function listAdminUsers({
  db,
  env,
}: WithDbAndEnv<{}>): Promise<Result<AdminUser[]>> {
  const adminRole = await getRoleByName({ db, env, roleName: AdminRoleName });
  if (adminRole === null) {
    return {
      ok: false,
      errorCode: ErrorCodes.ROLE_NOT_FOUND,
      error: "Admin role not found in system",
    } as const;
  }

  const users = await db
    .select({
      id: UserTable.id,
      email: UserTable.email,
      name: UserTable.name,
    })
    .from(UserRoleTable)
    .innerJoin(UserTable, eq(UserRoleTable.userId, UserTable.id))
    .where(
      and(
        eq(UserRoleTable.roleId, adminRole.id),
        eq(UserRoleTable.isActive, true),
        eq(UserTable.isActive, true)
      )
    )
    .orderBy(asc(UserTable.email));

  return {
    ok: true,
    data: users,
  } as const;
}

async function getActiveUserByEmail({
  db,
  email,
}: WithDbAndEnv<{ email: string }>): Promise<AdminUser | null> {
  const users = await db
    .select({
      id: UserTable.id,
      email: UserTable.email,
      name: UserTable.name,
    })
    .from(UserTable)
    .where(and(eq(UserTable.email, email), eq(UserTable.isActive, true)));

  if (users.length === 0) {
    return null;
  }

  return users[0];
}

async function createUserForAdmin({
  db,
  email,
}: WithDbAndEnv<{ email: string }>): Promise<Result<AdminUser>> {
  const randomPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const passwordHash = await hashPassword(randomPassword);

  const inserted = await db
    .insert(UserTable)
    .values({
      email,
      passwordHash,
    })
    .returning({
      id: UserTable.id,
      email: UserTable.email,
      name: UserTable.name,
    });

  if (inserted.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Failed to create user",
    } as const;
  }

  return {
    ok: true,
    data: inserted[0],
  } as const;
}

async function ensureUserHasAdminRole({
  db,
  env,
  userId,
}: WithDbAndEnv<{ userId: string }>): Promise<Result<true>> {
  const adminRole = await getRoleByName({ db, env, roleName: AdminRoleName });
  if (adminRole === null) {
    return {
      ok: false,
      errorCode: ErrorCodes.ROLE_NOT_FOUND,
      error: "Admin role not found in system",
    } as const;
  }

  const userRoles = await db
    .select({
      id: UserRoleTable.id,
      isActive: UserRoleTable.isActive,
    })
    .from(UserRoleTable)
    .where(
      and(eq(UserRoleTable.userId, userId), eq(UserRoleTable.roleId, adminRole.id))
    );

  if (userRoles.length > 0) {
    const firstRole = userRoles[0];
    if (firstRole.isActive) {
      return { ok: true, data: true } as const;
    }

    await db
      .update(UserRoleTable)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(UserRoleTable.id, firstRole.id));

    return { ok: true, data: true } as const;
  }

  const inserted = await db
    .insert(UserRoleTable)
    .values({
      userId,
      roleId: adminRole.id,
    })
    .returning({
      id: UserRoleTable.id,
    });

  if (inserted.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Failed to assign admin role",
    } as const;
  }

  return { ok: true, data: true } as const;
}

export async function grantAdminPrivileges({
  db,
  env,
  email,
}: WithDbAndEnv<{ email: string }>): Promise<Result<AdminUser>> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Email is required",
    } as const;
  }

  const existingUser = await getActiveUserByEmail({
    db,
    env,
    email: normalizedEmail,
  });

  const userResult =
    existingUser === null
      ? await createUserForAdmin({ db, env, email: normalizedEmail })
      : ({ ok: true, data: existingUser } as const);

  if (!userResult.ok) {
    return userResult;
  }

  const roleResult = await ensureUserHasAdminRole({
    db,
    env,
    userId: userResult.data.id,
  });

  if (!roleResult.ok) {
    return roleResult;
  }

  return {
    ok: true,
    data: userResult.data,
  } as const;
}

export async function removeAdminPrivileges({
  db,
  env,
  userId,
}: WithDbAndEnv<{ userId: string }>): Promise<Result<{ ok: true }>> {
  const users = await db
    .select({
      id: UserTable.id,
    })
    .from(UserTable)
    .where(and(eq(UserTable.id, userId), eq(UserTable.isActive, true)));

  if (users.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.USER_NOT_FOUND,
      error: "User not found",
    } as const;
  }

  const adminRole = await getRoleByName({ db, env, roleName: AdminRoleName });
  if (adminRole === null) {
    return {
      ok: false,
      errorCode: ErrorCodes.ROLE_NOT_FOUND,
      error: "Admin role not found in system",
    } as const;
  }

  const userRoles = await db
    .select({
      id: UserRoleTable.id,
      isActive: UserRoleTable.isActive,
    })
    .from(UserRoleTable)
    .where(
      and(eq(UserRoleTable.userId, userId), eq(UserRoleTable.roleId, adminRole.id))
    );

  if (userRoles.length === 0 || !userRoles[0].isActive) {
    return {
      ok: false,
      errorCode: ErrorCodes.USER_DOES_NOT_HAVE_ROLE,
      error: "User does not have admin role",
    } as const;
  }

  await db
    .update(UserRoleTable)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(UserRoleTable.id, userRoles[0].id));

  return {
    ok: true,
    data: { ok: true },
  } as const;
}
