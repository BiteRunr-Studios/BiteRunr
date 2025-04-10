import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const locations = pgTable("locations", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address"),
});

export default locations;
