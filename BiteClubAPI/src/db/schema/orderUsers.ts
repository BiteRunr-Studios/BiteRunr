import { pgTable, timestamp, unique, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { orders, users } from "./index";
import { sql, relations } from "drizzle-orm";
import { z } from "zod";

export const orderUsersStatusEnum = pgEnum("order_users_enum", [
    "ordering",
    "done",
]);

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
        status: orderUsersStatusEnum().notNull().default("ordering"),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => new Date()),
    },
    (t) => [unique().on(t.user_id, t.order_id)]
).enableRLS();

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

export const selectOrderUsersSchema = createSelectSchema(orderUsers);
export const insertOrderUsersSchema = createInsertSchema(orderUsers)
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        user_id: z.string().nonempty("User Id is required"),
        order_id: z.string().nonempty("Order Id is required"),
    });
export const patchOrderUsersSchema = insertOrderUsersSchema.partial();

export default orderUsers;
