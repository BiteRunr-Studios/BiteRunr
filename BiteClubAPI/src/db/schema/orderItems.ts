import {
    pgTable,
    timestamp,
    uuid,
    unique,
    text,
    integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { orderUsers, items, orderLocations } from "./index";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const orderItems = pgTable(
    "order_items",
    {
        id: uuid().primaryKey().defaultRandom(),
        order_location_id: uuid()
            .notNull()
            .references(() => orderLocations.id, { onDelete: "cascade" }),
        order_user_id: uuid()
            .notNull()
            .references(() => orderUsers.id, { onDelete: "cascade" }),
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
    (t) => [unique().on(t.order_user_id, t.item_id, t.comments)]
).enableRLS();

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    orderLocation: one(orderLocations, {
        fields: [orderItems.order_location_id],
        references: [orderLocations.id],
    }),
    user: one(orderUsers, {
        fields: [orderItems.order_user_id],
        references: [orderUsers.id],
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
        order_user_id: z.string().nonempty("Order User Id is required"),
        item_id: z.string().nonempty("Item Id is required"),
        quantity: z.number().min(1, "Quantity must be 1 or more"),
    });
export const patchOrderItemsSchema = insertOrderItemsSchema.partial().omit({
    order_location_id: true,
    order_user_id: true,
    item_id: true,
});

export default orderItems;
