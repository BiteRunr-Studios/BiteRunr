import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
// @ts-ignore
import { locations } from "./locations";

export const items = pgTable("items", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    locationId: integer("location_id").references(() => locations.id),
    price: integer("price").notNull(), // It is stored in cents, no rounding errors
});

export default items;
