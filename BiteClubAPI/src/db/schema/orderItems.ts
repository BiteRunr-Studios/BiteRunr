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
        updated_at: timestamp().notNull().defaultNow(),
    },
    (t) => [unique().on(t.user_id, t.name)]
);

export const selectOrderItemsSchema = createSelectSchema(orderItems);
export const insertOrderItemsSchema = createInsertSchema(orderItems);
export const patchOrderItemsSchema = insertOrderItemsSchema.partial();

export default orderItems;
