CREATE TABLE "username_holds" (
	"username" "citext" PRIMARY KEY NOT NULL,
	"released_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "username_holds_released_at_idx" ON "username_holds" USING btree ("released_at");