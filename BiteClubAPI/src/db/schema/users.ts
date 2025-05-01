import { sql, relations } from "drizzle-orm";
import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  orderUsers,
  orderItems,
  friends,
  friendRequests,
  orders,
  authUsers,
} from "./index";
import { selectOrdersSchema } from "./orders";
import { selectOrderUsersSchema } from "./orderUsers";
import { selectOrderItemsSchema } from "./orderItems";
import { selectFriendsSchema } from "./friends";
import { selectFriendRequestsSchema } from "./friendRequests";

export const users = pgTable("user_profiles", {
  id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  first_name: varchar().notNull(),
  last_name: varchar().notNull(),
  // email: varchar().notNull().unique(),
  // clerk_id: varchar().notNull().unique(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
}).enableRLS();

export const usersRelations = relations(users, ({ many, one }) => ({
  createdOrders: many(orders),
  orderUsers: many(orderUsers),
  orderItems: many(orderItems),
  friends: many(friends),
  authUser: one(authUsers, {
    fields: [users.id],
    references: [authUsers.id],
  }),
  sentFriendRequests: many(friendRequests, {
    relationName: "sent_requests",
  }),
  receivedFriendRequests: many(friendRequests, {
    relationName: "received_requests",
  }),
}));

export const baseUserSchema = createSelectSchema(users).omit({ id: true });

export const selectUserSchema = createSelectSchema(users).extend({
  created_orders: selectOrdersSchema.optional(),
  order_users: selectOrderUsersSchema.optional(),
  order_items: selectOrderItemsSchema.optional(),
  friends: selectFriendsSchema.optional(),
  sent_friend_requests: selectFriendRequestsSchema.optional(),
  received_friend_requests: selectFriendRequestsSchema.optional(),
});

export const insertUserSchema = createInsertSchema(users)
  .extend({
    first_name: z.string().nonempty("First Name is required"),
    last_name: z.string().nonempty("Last Name is required"),
  })
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  });

export const patchUserSchema = insertUserSchema.partial().extend({
  first_name: z.string().optional().or(z.literal("").or(z.null())),
  last_name: z.string().optional().or(z.literal("").or(z.null())),
});

export default users;
