import { and, desc, eq, gte, lte } from "drizzle-orm";
import { WithDb } from "../utils/commonTypes";
import { ErrorCodes } from "../utils/error";
import { SubmissionStatuses, SubmissionTable, TenderTable } from "./db/schema";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: ErrorCodes; error: string };

type ApplicationStatus = "draft" | "submitted";

export type ApplicationSummary = {
  applicationId: string;
  tenderId: string;
  tenderTitle: string;
  status: ApplicationStatus;
  submittedAt: Date | null;
  createdAt: Date;
  createdBy: string;
  firstDateToApply: Date;
  lastDateToApply: Date;
};

export type TenderSummary = {
  tenderId: string;
  title: string;
  firstDateToApply: Date;
  lastDateToApply: Date;
};

type ApplicationsOverview = {
  applications: ApplicationSummary[];
  tenders: TenderSummary[];
};

type ApplicationRow = {
  applicationId: string;
  tenderId: string;
  tenderTitle: string;
  status: string;
  submittedAt: Date | null;
  createdAt: Date;
  createdBy: string;
  firstDateToApply: Date;
  lastDateToApply: Date;
};

function toApplicationStatus(status: string): ApplicationStatus {
  if (status === SubmissionStatuses.SUBMITTED) {
    return SubmissionStatuses.SUBMITTED;
  }

  return SubmissionStatuses.DRAFT;
}

function mapToApplicationSummary(row: ApplicationRow): ApplicationSummary {
  return {
    applicationId: row.applicationId,
    tenderId: row.tenderId,
    tenderTitle: row.tenderTitle,
    status: toApplicationStatus(row.status),
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    firstDateToApply: row.firstDateToApply,
    lastDateToApply: row.lastDateToApply,
  };
}

function isTenderOpenForApply({
  firstDateToApply,
  lastDateToApply,
  now,
}: {
  firstDateToApply: Date;
  lastDateToApply: Date;
  now: Date;
}): boolean {
  return firstDateToApply.getTime() <= now.getTime() && now.getTime() <= lastDateToApply.getTime();
}

async function getUserApplications({
  db,
  userId,
}: WithDb<{ userId: string }>): Promise<ApplicationSummary[]> {
  const rows = await db
    .select({
      applicationId: SubmissionTable.id,
      tenderId: SubmissionTable.tenderId,
      tenderTitle: TenderTable.title,
      status: SubmissionTable.status,
      submittedAt: SubmissionTable.submittedAt,
      createdAt: SubmissionTable.createdAt,
      createdBy: SubmissionTable.createdBy,
      firstDateToApply: TenderTable.firstDateToApply,
      lastDateToApply: TenderTable.lastDateToApply,
    })
    .from(SubmissionTable)
    .innerJoin(TenderTable, eq(SubmissionTable.tenderId, TenderTable.id))
    .where(
      and(
        eq(SubmissionTable.userId, userId),
        eq(SubmissionTable.isActive, true),
        eq(TenderTable.isActive, true)
      )
    )
    .orderBy(desc(SubmissionTable.createdAt));

  const applications: ApplicationSummary[] = [];
  for (const row of rows) {
    applications.push(mapToApplicationSummary(row));
  }

  return applications;
}

async function getActiveTendersToApply({
  db,
  now,
}: WithDb<{ now: Date }>): Promise<TenderSummary[]> {
  const tenders = await db
    .select({
      tenderId: TenderTable.id,
      title: TenderTable.title,
      firstDateToApply: TenderTable.firstDateToApply,
      lastDateToApply: TenderTable.lastDateToApply,
    })
    .from(TenderTable)
    .where(
      and(
        eq(TenderTable.isActive, true),
        lte(TenderTable.firstDateToApply, now),
        gte(TenderTable.lastDateToApply, now)
      )
    )
    .orderBy(desc(TenderTable.createdAt));

  return tenders;
}

async function getTenderById({
  db,
  tenderId,
}: WithDb<{ tenderId: string }>): Promise<TenderSummary | null> {
  const tenders = await db
    .select({
      tenderId: TenderTable.id,
      title: TenderTable.title,
      firstDateToApply: TenderTable.firstDateToApply,
      lastDateToApply: TenderTable.lastDateToApply,
    })
    .from(TenderTable)
    .where(and(eq(TenderTable.id, tenderId), eq(TenderTable.isActive, true)));

  if (tenders.length === 0) {
    return null;
  }

  return tenders[0];
}

async function getExistingApplicationForTender({
  db,
  userId,
  tenderId,
}: WithDb<{
  userId: string;
  tenderId: string;
}>): Promise<ApplicationSummary | null> {
  const rows = await db
    .select({
      applicationId: SubmissionTable.id,
      tenderId: SubmissionTable.tenderId,
      tenderTitle: TenderTable.title,
      status: SubmissionTable.status,
      submittedAt: SubmissionTable.submittedAt,
      createdAt: SubmissionTable.createdAt,
      createdBy: SubmissionTable.createdBy,
      firstDateToApply: TenderTable.firstDateToApply,
      lastDateToApply: TenderTable.lastDateToApply,
    })
    .from(SubmissionTable)
    .innerJoin(TenderTable, eq(SubmissionTable.tenderId, TenderTable.id))
    .where(
      and(
        eq(SubmissionTable.userId, userId),
        eq(SubmissionTable.tenderId, tenderId),
        eq(SubmissionTable.isActive, true),
        eq(TenderTable.isActive, true)
      )
    );

  if (rows.length === 0) {
    return null;
  }

  return mapToApplicationSummary(rows[0]);
}

export async function listApplicationsForUser({
  db,
  userId,
  now,
}: WithDb<{
  userId: string;
  now: Date;
}>): Promise<ServiceResult<ApplicationsOverview>> {
  const applications = await getUserApplications({ db, userId });
  if (applications.length > 0) {
    return {
      ok: true,
      data: {
        applications,
        tenders: [],
      },
    } as const;
  }

  const tenders = await getActiveTendersToApply({ db, now });
  return {
    ok: true,
    data: {
      applications: [],
      tenders,
    },
  } as const;
}

export async function applyToTender({
  db,
  userId,
  tenderId,
  now,
}: WithDb<{
  userId: string;
  tenderId: string;
  now: Date;
}>): Promise<ServiceResult<{ application: ApplicationSummary }>> {
  const tender = await getTenderById({ db, tenderId });
  if (tender === null) {
    return {
      ok: false,
      errorCode: ErrorCodes.TENDER_NOT_FOUND,
      error: "Tender not found",
    } as const;
  }

  if (
    !isTenderOpenForApply({
      firstDateToApply: tender.firstDateToApply,
      lastDateToApply: tender.lastDateToApply,
      now,
    })
  ) {
    return {
      ok: false,
      errorCode: ErrorCodes.TENDER_NOT_OPEN_FOR_APPLICATIONS,
      error: "Tender is not open for applications",
    } as const;
  }

  const existing = await getExistingApplicationForTender({
    db,
    userId,
    tenderId: tender.tenderId,
  });

  if (existing !== null) {
    return {
      ok: true,
      data: {
        application: existing,
      },
    } as const;
  }

  const created = await db
    .insert(SubmissionTable)
    .values({
      tenderId: tender.tenderId,
      userId,
      createdBy: userId,
      status: SubmissionStatuses.DRAFT,
    })
    .returning({
      applicationId: SubmissionTable.id,
      status: SubmissionTable.status,
      submittedAt: SubmissionTable.submittedAt,
      createdAt: SubmissionTable.createdAt,
      createdBy: SubmissionTable.createdBy,
    });

  if (created.length === 0) {
    return {
      ok: false,
      errorCode: ErrorCodes.INVALID_INPUT,
      error: "Failed to create application",
    } as const;
  }

  return {
    ok: true,
    data: {
      application: {
        applicationId: created[0].applicationId,
        tenderId: tender.tenderId,
        tenderTitle: tender.title,
        status: toApplicationStatus(created[0].status),
        submittedAt: created[0].submittedAt,
        createdAt: created[0].createdAt,
        createdBy: created[0].createdBy,
        firstDateToApply: tender.firstDateToApply,
        lastDateToApply: tender.lastDateToApply,
      },
    },
  } as const;
}
