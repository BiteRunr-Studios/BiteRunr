import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";
import orders from "./orders";
import { sql, relations } from "drizzle-orm";

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
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [unique().on(t.user_id, t.order_id)]
).enableRLS();

export const selectOrderUsersSchema = createSelectSchema(orderUsers);
export const insertOrderUsersSchema = createInsertSchema(orderUsers).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const patchOrderUsersSchema = insertOrderUsersSchema.partial();

export const orderUsersRelations = relations(orderUsers, ({ one }) => ({
    user: one(users, {
        fields: [orderUsers.user_id],
        references: [users.id],
    }),
    order: one(orders, {
        fields: [orderUsers.order_id],
        references: [orders.id],
    }),
}));

export default orderUsers;
