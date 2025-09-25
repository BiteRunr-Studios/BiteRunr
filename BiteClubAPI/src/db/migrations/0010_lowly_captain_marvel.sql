ALTER TABLE "items" DROP CONSTRAINT "items_name_unique";--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_name_location_id_unique" UNIQUE("name","location_id");