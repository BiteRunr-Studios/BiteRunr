ALTER TABLE "auth"."users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_users" ADD COLUMN "amount_owed" numeric(12, 2) DEFAULT '0.00' NOT NULL;