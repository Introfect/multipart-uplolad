CREATE TABLE "submission" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_session" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"content_type" text NOT NULL,
	"object_key" text NOT NULL,
	"upload_id" text NOT NULL,
	"part_size_bytes" integer NOT NULL,
	"total_parts" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"completed_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_file" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"upload_session_id" text NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"content_type" text NOT NULL,
	"etag" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_tender_id_tender_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_session" ADD CONSTRAINT "upload_session_tender_id_tender_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_session" ADD CONSTRAINT "upload_session_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_session" ADD CONSTRAINT "upload_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD CONSTRAINT "uploaded_file_tender_id_tender_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD CONSTRAINT "uploaded_file_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD CONSTRAINT "uploaded_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD CONSTRAINT "uploaded_file_upload_session_id_upload_session_id_fk" FOREIGN KEY ("upload_session_id") REFERENCES "public"."upload_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "submission_tender_id_user_id_key" ON "submission" USING btree ("tender_id","user_id") WHERE "submission"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "tender_title_key" ON "tender" USING btree ("title") WHERE "tender"."is_active";--> statement-breakpoint
CREATE INDEX "upload_session_submission_id_idx" ON "upload_session" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "upload_session_user_id_tender_id_idx" ON "upload_session" USING btree ("user_id","tender_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uploaded_file_submission_id_question_id_key" ON "uploaded_file" USING btree ("submission_id","question_id") WHERE "uploaded_file"."is_active";--> statement-breakpoint
CREATE INDEX "uploaded_file_submission_id_idx" ON "uploaded_file" USING btree ("submission_id");