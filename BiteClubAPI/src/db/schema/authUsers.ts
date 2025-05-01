import { PgSchema, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pgTable, uuid, pgSchema } from "drizzle-orm/pg-core";
import { users } from "./index";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { baseUserSchema, insertUserSchema, patchUserSchema } from "./users";
import { z } from "zod";
import { profile } from "console";

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
    email: z
      .string()
      .nonempty("Email is required")
      .email("Email is not formatted correctly"),
    profile: insertUserSchema,
  })
  .omit({
    id: true,
  });

export const patchAuthUserSchema = insertAuthUserSchema
  .partial()
  .omit({ password: true })
  .extend({
    email: z
      .string()
      .email("Email is not formatted correctly")
      .optional()
      .or(z.literal("").or(z.null())),
    access_token: z.string().nonempty("Access token is required"),
    refresh_token: z.string().nonempty("Refresh token is required"),
    profile: patchUserSchema,
  });

export const resetUserAuthPasswordSchema = insertAuthUserSchema
  .omit({
    email: true,
  })
  .extend({
    old_password: z.string().nonempty("Old password is required"),
  })
  .omit({
    profile: true,
  });

export const sessionSchema = z.object({
  access_token: z.string().nonempty("Access token is required"),
  refresh_token: z.string().nonempty("Refresh token is required"),
  user: selectAuthUserSchema.omit({
    profile: true,
    email: true,
  }),
});

export const insertAuthUserSSOSchema = baseUserSchema
  .extend({
    id: z.string().nonempty("User id is required"),
  })
  .omit({
    created_at: true,
    updated_at: true,
  });

export default authUsers;
