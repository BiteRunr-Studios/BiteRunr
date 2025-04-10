import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";
// @ts-ignore
import { user } from "./user";

export const orderGroups = pgTable("order_groups", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar().notNull(),
    createdById: integer().references(() => user.id),
    createdAt: timestamp().notNull().defaultNow(),
    status: varchar().notNull(),
});

export default orderGroups;
