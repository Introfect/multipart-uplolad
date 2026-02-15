ALTER TABLE "submission" ADD COLUMN "created_by" text;--> statement-breakpoint
UPDATE "submission" SET "created_by" = "user_id" WHERE "created_by" IS NULL;--> statement-breakpoint
ALTER TABLE "submission" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tender" ADD COLUMN "first_date_to_apply" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tender" ADD COLUMN "last_date_to_apply" timestamp with time zone;--> statement-breakpoint
UPDATE "tender"
SET
  "first_date_to_apply" = TIMESTAMPTZ '2026-01-01T00:00:00.000Z',
  "last_date_to_apply" = TIMESTAMPTZ '2027-01-01T00:00:00.000Z';--> statement-breakpoint
ALTER TABLE "tender" ALTER COLUMN "first_date_to_apply" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tender" ALTER COLUMN "last_date_to_apply" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
