import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";

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
        updated_at: timestamp().notNull().defaultNow(),
    },
    (t) => [unique().on(t.user_id, t.friend_id)]
);

export const selectFriendsSchema = createSelectSchema(friends);
export const insertFriendsSchema = createInsertSchema(friends);
export const patchFriendsSchema = insertFriendsSchema.partial();

export default friends;
