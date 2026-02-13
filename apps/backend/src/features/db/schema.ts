import { sql } from "drizzle-orm";
import {
  boolean,
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
