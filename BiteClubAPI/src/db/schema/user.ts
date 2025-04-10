import { integer, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const user = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    first_name: varchar({ length: 255 }).notNull(),
    last_name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
});

// Many-to-many relationship for user friendships
export const userFriends = pgTable("user_friends", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
        .notNull()
        .references(() => user.id),
    friendId: integer("friend_id")
        .notNull()
        .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow(),
});

export const selectUserSchema = createSelectSchema(user);
export const insertUserSchema = createInsertSchema(user).extend({
    email: z.string().email(),
});
export const patchUserSchema = insertUserSchema.partial();

export default user;
