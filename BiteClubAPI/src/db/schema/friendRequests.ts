import { pgTable, timestamp, uuid, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";
import { relations } from "drizzle-orm";
import { z } from "zod";

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
            .$onUpdateFn(() => new Date()),
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
const baseSchema = createInsertSchema(friendRequests)
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        sender_id: z.string().nonempty("Sender Id is required"),
        receiver_id: z.string().nonempty("Receiver Id is required"),
    });

export const insertFriendRequestsSchema = baseSchema.refine(
    (data) => data.sender_id !== data.receiver_id,
    {
        message: "Sender and receiver cannot be the same user.",
        path: ["receiver_id", "sender_id"],
    }
);

export const patchFriendRequestsSchema = baseSchema
    .partial()
    .superRefine((data, ctx) => {
        if (
            data.sender_id !== undefined &&
            data.receiver_id !== undefined &&
            data.sender_id === data.receiver_id
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Sender and receiver cannot be the same user.",
                path: ["receiver_id", "sender_id"],
            });
        }
    });

export default friendRequests;
