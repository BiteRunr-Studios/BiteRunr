import {
    pgTable,
    timestamp,
    uuid,
    pgEnum,
    unique,
    varchar,
    text,
    integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";
import orderLocations from "./orderLocations";
import { sql, relations } from "drizzle-orm";

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
        name: varchar().notNull(),
        comments: text(),
        quantity: integer().notNull(),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`),
    },
    (t) => [unique().on(t.user_id, t.name)]
).enableRLS();

export const selectOrderItemsSchema = createSelectSchema(orderItems);
export const insertOrderItemsSchema = createInsertSchema(orderItems).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const patchOrderItemsSchema = insertOrderItemsSchema.partial();

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    orderLocation: one(orderLocations, {
        fields: [orderItems.order_location_id],
        references: [orderLocations.id],
    }),
    user: one(users, {
        fields: [orderItems.user_id],
        references: [users.id],
    }),
}));

export default orderItems;
