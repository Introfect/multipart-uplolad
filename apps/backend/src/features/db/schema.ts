import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const CommonRows = {
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

export const SubmissionStatuses = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatuses)[keyof typeof SubmissionStatuses];

export const UploadSessionStatuses = {
  INITIATED: "initiated",
  COMPLETED: "completed",
  ABORTED: "aborted",
} as const;

export type UploadSessionStatus =
  (typeof UploadSessionStatuses)[keyof typeof UploadSessionStatuses];

export const UserTable = pgTable(
  "user",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text().notNull(),
    passwordHash: text().notNull(),
    firmName: text(),
    name: text(),
    phoneNumber: text(),
    ...CommonRows,
  },
  (t) => [
    uniqueIndex("user_email_key")
      .on(t.email)
      .where(sql`${t.isActive}`),
  ]
);

export const RoleTable = pgTable(
  "role",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text().notNull(),
    ...CommonRows,
  },
  (t) => [
    uniqueIndex("role_name_key")
      .on(t.name)
      .where(sql`${t.isActive}`),
  ]
);

export const UserRoleTable = pgTable(
  "user_role",
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text()
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    roleId: text()
      .notNull()
      .references(() => RoleTable.id, { onDelete: "cascade" }),
    ...CommonRows,
  },
  (t) => [
    uniqueIndex("user_role_user_id_role_id_key")
      .on(t.userId, t.roleId)
      .where(sql`${t.isActive}`),
  ]
);

export const TenderTable = pgTable(
  "tender",
  {
    id: text().primaryKey(),
    title: text().notNull(),
    firstDateToApply: timestamp({ withTimezone: true }).notNull(),
    lastDateToApply: timestamp({ withTimezone: true }).notNull(),
    ...CommonRows,
  },
  (t) => [
    uniqueIndex("tender_title_key")
      .on(t.title)
      .where(sql`${t.isActive}`),
  ]
);

export const SubmissionTable = pgTable(
  "submission",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenderId: text()
      .notNull()
      .references(() => TenderTable.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    createdBy: text()
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    status: text().notNull().default(SubmissionStatuses.DRAFT),
    submittedAt: timestamp({ withTimezone: true }),
    ...CommonRows,
  },
  (t) => [
    uniqueIndex("submission_tender_id_user_id_key")
      .on(t.tenderId, t.userId)
      .where(sql`${t.isActive}`),
  ]
);

export const UploadSessionTable = pgTable(
  "upload_session",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenderId: text()
      .notNull()
      .references(() => TenderTable.id, { onDelete: "cascade" }),
    submissionId: text()
      .notNull()
      .references(() => SubmissionTable.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    questionId: text().notNull(),
    fileName: text().notNull(),
    fileSizeBytes: bigint({ mode: "number" }).notNull(),
    contentType: text().notNull(),
    objectKey: text().notNull(),
    uploadId: text().notNull(),
    partSizeBytes: integer().notNull(),
    totalParts: integer().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    status: text().notNull().default(UploadSessionStatuses.INITIATED),
    completedAt: timestamp({ withTimezone: true }),
    ...CommonRows,
  },
  (t) => [
    index("upload_session_submission_id_idx").on(t.submissionId),
    index("upload_session_user_id_tender_id_idx").on(t.userId, t.tenderId),
  ]
);

export const UploadedFileTable = pgTable(
  "uploaded_file",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tenderId: text()
      .notNull()
      .references(() => TenderTable.id, { onDelete: "cascade" }),
    submissionId: text()
      .notNull()
      .references(() => SubmissionTable.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    questionId: text().notNull(),
    uploadSessionId: text()
      .notNull()
      .references(() => UploadSessionTable.id, { onDelete: "cascade" }),
    objectKey: text().notNull(),
    fileName: text().notNull(),
    fileSizeBytes: bigint({ mode: "number" }).notNull(),
    contentType: text().notNull(),
    etag: text().notNull(),
    uploadedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ...CommonRows,
  },
  (t) => [
    uniqueIndex("uploaded_file_submission_id_question_id_key")
      .on(t.submissionId, t.questionId)
      .where(sql`${t.isActive}`),
    index("uploaded_file_submission_id_idx").on(t.submissionId),
  ]
);

export const ApplicationStateTable = pgTable(
  "application_state",
  {
    id: text()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text()
      .notNull()
      .references(() => SubmissionTable.id, { onDelete: "cascade" }),
    data: jsonb().notNull(),
    ...CommonRows,
  },
  (t) => [
    uniqueIndex("application_state_submission_id_key")
      .on(t.submissionId)
      .where(sql`${t.isActive}`),
  ]
);

export type PersistedFormState = {
  version: 1;
  singleUploads: Partial<Record<string, CompletedUploadFile>>;
  multiUploads: Partial<Record<string, CompletedMultiUploadFile[]>>;
};

export type CompletedUploadFile = {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  completedAt: string;
};

export type CompletedMultiUploadFile = CompletedUploadFile & {
  key: string;
};
