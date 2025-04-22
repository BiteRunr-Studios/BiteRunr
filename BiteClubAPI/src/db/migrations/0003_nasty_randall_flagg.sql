CREATE TYPE "public"."order_users_enum" AS ENUM('ordering', 'done');--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_user_id_name_unique";--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "item_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "order_users" ADD COLUMN "status" "order_users_enum" DEFAULT 'ordering' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_user_id_item_id_unique" UNIQUE("user_id","item_id");