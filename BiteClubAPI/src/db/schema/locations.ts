import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const locations = pgTable("locations", {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    address: varchar().notNull().default("None"),
});

export const selectLocationsSchema = createSelectSchema(locations);
export const insertLocationsSchema = createInsertSchema(locations);
export const patchLocationsSchema = insertLocationsSchema.partial();

export default locations;
