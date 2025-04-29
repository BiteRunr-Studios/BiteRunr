import { PgSchema, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pgTable, uuid, pgSchema } from "drizzle-orm/pg-core";
import { users } from "./index";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { baseUserSchema } from "./users";
import { z } from "zod";

export const authSchema = pgSchema("auth")

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: varchar().notNull(),
});

export const authUsersRelations = relations(authUsers, ({one}) => ({
  profile: one(users)
}));

export const selectAuthUserSchema = createSelectSchema(authUsers).extend({
  profile: baseUserSchema.optional(),
});

export const insertAuthUserSchema = createInsertSchema(authUsers)
  .extend({
    password: z.string().nonempty("Password is required"),
  })
  .omit({
    id: true,
  });

export default authUsers