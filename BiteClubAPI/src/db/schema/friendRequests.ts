import { pgTable, timestamp, uuid, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";

export const friendRequestStatusEnum = pgEnum("friend_request_status_enum", [
    "pending",
    "accepted",
    "rejected",
]);

export const friendRequests = pgTable(
    "friend_requests",
    {
        id: uuid().primaryKey().defaultRandom(),
        sender_id: uuid()
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        receiver_id: uuid()
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        status: friendRequestStatusEnum().notNull(),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp().notNull().defaultNow(),
    },
    (t) => [unique().on(t.sender_id, t.receiver_id)]
);

export const selectFriendRequestsSchema = createSelectSchema(friendRequests);
export const insertFriendRequestsSchema = createInsertSchema(friendRequests);
export const patchFriendRequestsSchema = insertFriendRequestsSchema.partial();

export default friendRequests;
