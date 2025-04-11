import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    first_name: varchar().notNull(),
    last_name: varchar().notNull(),
    email: varchar().notNull().unique(),
    clerk_id: varchar().notNull().unique(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
});

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users).extend({
    email: z.string().email(),
});
export const patchUserSchema = insertUserSchema.partial();

export default users;
