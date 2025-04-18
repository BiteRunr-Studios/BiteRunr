import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const friends = pgTable(
    "friends",
    {
        id: uuid().primaryKey().defaultRandom(),
        user_id: uuid()
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        friend_id: uuid()
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => new Date()),
    },
    (t) => [unique().on(t.user_id, t.friend_id)]
).enableRLS();

export const friendsRelations = relations(friends, ({ one }) => ({
    user: one(users, {
        fields: [friends.user_id],
        references: [users.id],
    }),
    friend: one(users, {
        fields: [friends.friend_id],
        references: [users.id],
    }),
}));

export const selectFriendsSchema = createSelectSchema(friends);
export const insertFriendsSchema = createInsertSchema(friends)
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        user_id: z.string().nonempty("User Id is required"),
        friend_id: z.string().nonempty("Friend Id is required"),
    });
export const patchFriendsSchema = insertFriendsSchema.partial();

export default friends;
