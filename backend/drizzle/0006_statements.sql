CREATE TABLE "statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"text" varchar(120) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "statements_ends_after_start_check" CHECK ("statements"."ends_at" > "statements"."started_at"),
	CONSTRAINT "statements_ended_after_start_check" CHECK ("statements"."ended_at" is null or "statements"."ended_at" >= "statements"."started_at")
);
--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "statement_id" uuid;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "statements_profile_started_idx" ON "statements" USING btree ("profile_id","started_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "statements_one_open_idx" ON "statements" USING btree ("profile_id") WHERE "statements"."ended_at" is null;--> statement-breakpoint
ALTER TABLE "drops" ADD CONSTRAINT "drops_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."statements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drops_statement_created_idx" ON "drops" USING btree ("statement_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "accepting_drops";