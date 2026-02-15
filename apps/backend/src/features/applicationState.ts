import { eq, and } from "drizzle-orm";
import { ApplicationStateTable, type PersistedFormState } from "./db/schema";
import { ErrorCodes } from "../utils/error";
import type { WithDbAndEnv } from "../utils/commonTypes";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: ErrorCodes; error: string };

export async function getApplicationState({
  db,
  submissionId,
  userId,
}: WithDbAndEnv<{
  submissionId: string;
  userId: string;
}>): Promise<ServiceResult<PersistedFormState>> {
  const states = await db
    .select({ data: ApplicationStateTable.data })
    .from(ApplicationStateTable)
    .where(
      and(
        eq(ApplicationStateTable.submissionId, submissionId),
        eq(ApplicationStateTable.isActive, true),
      ),
    );

  if (states.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.APPLICATION_STATE_NOT_FOUND,
      error: `Application state not found for - ${submissionId}.`,
    };
  }

  return { ok: true, data: states[0].data as PersistedFormState };
}

export async function updateApplicationState({
  db,
  submissionId,
  userId,
  data,
}: WithDbAndEnv<{
  submissionId: string;
  userId: string;
  data: PersistedFormState;
}>): Promise<ServiceResult<{ id: string }>> {
  const now = new Date();

  const inserted = await db
    .insert(ApplicationStateTable)
    .values({
      submissionId,
      data: data as any, // JSONB type
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [ApplicationStateTable.submissionId],
      targetWhere: eq(ApplicationStateTable.isActive, true),
      set: {
        data: data as any,
        updatedAt: now,
      },
    })
    .returning({ id: ApplicationStateTable.id });

  return { ok: true, data: { id: inserted[0].id } };
}
