import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import orders from "./orders";
import locations from "./locations";

export const orderLocations = pgTable("order_locations", {
    id: uuid().primaryKey().defaultRandom(),
    order_id: uuid()
        .notNull()
        .references(() => orders.id, { onDelete: "cascade" }),
    location_id: uuid()
        .notNull()
        .references(() => locations.id, { onDelete: "cascade" }),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
});

export const selectOrderLocationsSchema = createSelectSchema(orderLocations);
export const insertOrderLocationsSchema = createInsertSchema(orderLocations);
export const patchOrderLocationsSchema = insertOrderLocationsSchema.partial();

export default orderLocations;
