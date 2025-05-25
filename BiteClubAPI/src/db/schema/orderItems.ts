import {
    pgTable,
    timestamp,
    uuid,
    unique,
    text,
    integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";
import items from "./items";
import orderLocations from "./orderLocations";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const orderItems = pgTable(
    "order_items",
    {
        id: uuid().primaryKey().defaultRandom(),
        order_location_id: uuid()
            .notNull()
            .references(() => orderLocations.id, { onDelete: "cascade" }),
        user_id: uuid()
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        item_id: uuid()
            .notNull()
            .references(() => items.id, { onDelete: "cascade" }),
        comments: text(),
        quantity: integer().notNull(),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => new Date()),
    },
    (t) => [unique().on(t.user_id, t.item_id)]
).enableRLS();

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    orderLocation: one(orderLocations, {
        fields: [orderItems.order_location_id],
        references: [orderLocations.id],
    }),
    user: one(users, {
        fields: [orderItems.user_id],
        references: [users.id],
    }),
    item: one(items, {
        fields: [orderItems.item_id],
        references: [items.id],
    }),
}));

export const selectOrderItemsSchema = createSelectSchema(orderItems);
export const insertOrderItemsSchema = createInsertSchema(orderItems)
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        order_location_id: z.string().nonempty("Order Location Id is required"),
        user_id: z.string().nonempty("User Id is required"),
        item_id: z.string().nonempty("Item Id is required"),
        quantity: z.number().min(1, "Quantity must be 1 or more"),
    });
export const patchOrderItemsSchema = insertOrderItemsSchema.partial();

export default orderItems;
