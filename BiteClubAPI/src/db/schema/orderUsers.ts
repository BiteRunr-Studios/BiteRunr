import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";
import orders from "./orders";

export const orderUsers = pgTable(
    "order_users",
    {
        id: uuid().primaryKey().defaultRandom(),
        user_id: uuid()
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        order_id: uuid()
            .notNull()
            .references(() => orders.id, { onDelete: "cascade" }),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp().notNull().defaultNow(),
    },
    (t) => [unique().on(t.user_id, t.order_id)]
);

export const selectOrderUsersSchema = createSelectSchema(orderUsers);
export const insertOrderUsersSchema = createInsertSchema(orderUsers);
export const patchOrderUsersSchema = insertOrderUsersSchema.partial();

export default orderUsers;
