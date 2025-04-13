import { sql, relations } from "drizzle-orm";
import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import orders from "./orders";
import orderUsers from "./orderUsers";
import orderItems from "./orderItems";
import friends from "./friends";
import friendRequests from "./friendRequests";

export const users = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    first_name: varchar().notNull(),
    last_name: varchar().notNull(),
    email: varchar().notNull().unique(),
    clerk_id: varchar().notNull().unique(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp()
        .notNull()
        .defaultNow()
        .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`),
}).enableRLS();

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users)
    .extend({
        email: z.string().email(),
    })
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    });
export const patchUserSchema = insertUserSchema.partial();

export const usersRelations = relations(users, ({ many }) => ({
    createdOrders: many(orders),
    orderUsers: many(orderUsers),
    orderItems: many(orderItems),
    friends: many(friends),
    sentFriendRequests: many(friendRequests, {
        relationName: "sent_requests",
    }),
    receivedFriendRequests: many(friendRequests, {
        relationName: "received_requests",
    }),
}));

export default users;
