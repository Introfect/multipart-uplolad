CREATE TABLE "application_state" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_state" ADD CONSTRAINT "application_state_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_state_submission_id_key" ON "application_state" USING btree ("submission_id") WHERE "application_state"."is_active";