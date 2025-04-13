ALTER TABLE "friend_requests" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'created';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "paused" SET DEFAULT false;