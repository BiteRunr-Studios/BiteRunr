import { pgTable, timestamp, uuid, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";
import { sql, relations } from "drizzle-orm";

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
        status: friendRequestStatusEnum().notNull().default("pending"),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [unique().on(t.sender_id, t.receiver_id)]
).enableRLS();

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
    sender: one(users, {
        fields: [friendRequests.sender_id],
        references: [users.id],
        relationName: "sent_requests",
    }),
    receiver: one(users, {
        fields: [friendRequests.receiver_id],
        references: [users.id],
        relationName: "received_requests",
    }),
}));

export const selectFriendRequestsSchema = createSelectSchema(friendRequests);
export const insertFriendRequestsSchema = createInsertSchema(
    friendRequests
).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const patchFriendRequestsSchema = insertFriendRequestsSchema.partial();

export default friendRequests;
