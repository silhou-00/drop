ALTER TABLE "drops" DROP CONSTRAINT "drops_location_pair_check";--> statement-breakpoint
ALTER TABLE "drops" DROP CONSTRAINT "drops_location_source_check";--> statement-breakpoint
ALTER TABLE "drops" ALTER COLUMN "location" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ALTER COLUMN "location_source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD CONSTRAINT "drops_location_source_check" CHECK ("drops"."location_source" in ('gps'));