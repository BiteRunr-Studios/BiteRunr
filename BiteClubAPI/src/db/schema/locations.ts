import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import orderLocations from "./orderLocations";

export const locations = pgTable("locations", {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    address: varchar().notNull().default("None"),
}).enableRLS();

export const selectLocationsSchema = createSelectSchema(locations);
export const insertLocationsSchema = createInsertSchema(locations).omit({
    id: true,
});
export const patchLocationsSchema = insertLocationsSchema.partial();

export const locationsRelations = relations(locations, ({ many }) => ({
    orderLocations: many(orderLocations),
}));

export default locations;
