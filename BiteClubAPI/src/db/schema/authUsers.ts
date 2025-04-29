import { PgSchema, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pgTable, uuid, pgSchema } from "drizzle-orm/pg-core";
import { users } from "./index";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { baseUserSchema, insertUserSchema } from "./users";
import { z } from "zod";

export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: varchar().notNull().unique(),
});

export const authUsersRelations = relations(authUsers, ({ one }) => ({
  profile: one(users, {
    fields: [authUsers.id],
    references: [users.id],
    relationName: "profile",
  }),
}));

export const selectAuthUserSchema = createSelectSchema(authUsers).extend({
  profile: baseUserSchema,
});

export const insertAuthUserSchema = createInsertSchema(authUsers)
  .extend({
    password: z.string().nonempty("Password is required"),
    email: z.string().email("Email is not formatted correctly"),
    profile: insertUserSchema,
  })
  .omit({
    id: true,
  });

export default authUsers;
