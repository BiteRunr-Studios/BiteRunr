import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const user = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    first_name: varchar({ length: 255 }).notNull(),
    last_name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
});

export const insertUserSchema = createInsertSchema(user);
export const selectUserSchema = createSelectSchema(user);

export default user;
