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
} from "./index";
import { selectOrdersSchema } from "./orders";
import { selectOrderUsersSchema } from "./orderUsers";
import { selectOrderItemsSchema } from "./orderItems";
import { selectFriendsSchema } from "./friends";
import { selectFriendRequestsSchema } from "./friendRequests";

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
        .$onUpdateFn(() => new Date()),
}).enableRLS();

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
        email: z.string().nonempty("Email is required").email(),
        first_name: z.string().nonempty("First Name is required"),
        last_name: z.string().nonempty("Last Name is required"),
        clerk_id: z.string().nonempty("Clerk Id is required"),
    })
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    });
export const patchUserSchema = insertUserSchema.partial();

export default users;
