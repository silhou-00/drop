CREATE TABLE "drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"message" varchar(280) NOT NULL,
	"location" geography(Point,4326),
	"location_source" text,
	"location_name" varchar(100),
	"sender_key" char(64) NOT NULL,
	"device_key" char(64),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drops_location_source_check" CHECK ("drops"."location_source" in ('gps', 'manual')),
	CONSTRAINT "drops_location_pair_check" CHECK (("drops"."location" is null) = ("drops"."location_source" is null))
);
--> statement-breakpoint
CREATE TABLE "place_names" (
	"cell_key" text PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drops" ADD CONSTRAINT "drops_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drops_recipient_created_idx" ON "drops" USING btree ("recipient_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "drops_location_gist" ON "drops" USING gist ("location");--> statement-breakpoint
CREATE INDEX "place_names_fetched_idx" ON "place_names" USING btree ("fetched_at");