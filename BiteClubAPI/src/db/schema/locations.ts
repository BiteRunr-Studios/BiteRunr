import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { orderLocations, selectOrderLocationsSchema } from "./orderLocations";

export const locations = pgTable("locations", {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    address: varchar().notNull().default("None"),
}).enableRLS();

export const locationsRelations = relations(locations, ({ many }) => ({
    orderLocations: many(orderLocations),
}));

export const selectLocationsSchema = createSelectSchema(locations).extend({
    orderLocations: selectOrderLocationsSchema.optional(),
});
export const insertLocationsSchema = createInsertSchema(locations).omit({
    id: true,
});
export const patchLocationsSchema = insertLocationsSchema.partial();

export default locations;
