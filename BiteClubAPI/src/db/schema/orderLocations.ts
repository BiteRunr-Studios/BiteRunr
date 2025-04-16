import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { orders, locations, orderItems } from "./index";
import { sql, relations } from "drizzle-orm";
import { selectOrderItemsSchema } from "./orderItems";

export const orderLocations = pgTable("order_locations", {
    id: uuid().primaryKey().defaultRandom(),
    order_id: uuid()
        .notNull()
        .references(() => orders.id, { onDelete: "cascade" }),
    location_id: uuid()
        .notNull()
        .references(() => locations.id, { onDelete: "cascade" }),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp()
        .notNull()
        .defaultNow()
        .$onUpdateFn(() => new Date()),
}).enableRLS();

export const orderLocationsRelations = relations(
    orderLocations,
    ({ one, many }) => ({
        order: one(orders, {
            fields: [orderLocations.order_id],
            references: [orders.id],
        }),
        location: one(locations, {
            fields: [orderLocations.location_id],
            references: [locations.id],
        }),
        orderItems: many(orderItems),
    })
);

export const selectOrderLocationsSchema = createSelectSchema(
    orderLocations
).extend({
    order_items: selectOrderItemsSchema.optional(),
});
export const insertOrderLocationsSchema = createInsertSchema(
    orderLocations
).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const patchOrderLocationsSchema = insertOrderLocationsSchema.partial();

export default orderLocations;
