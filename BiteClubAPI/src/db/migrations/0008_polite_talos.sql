ALTER TABLE "order_items" RENAME COLUMN "user_id" TO "order_user_id";--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_user_id_item_id_unique";--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_user_id_user_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_user_id_order_users_id_fk" FOREIGN KEY ("order_user_id") REFERENCES "public"."order_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_user_id_item_id_unique" UNIQUE("order_user_id","item_id");