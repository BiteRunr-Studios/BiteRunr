import {
    pgTable,
    varchar,
    timestamp,
    uuid,
    pgEnum,
    boolean,
    text,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import users from "./users";

export const orderStatusEnum = pgEnum("order_status", [
    "pending",
    "accepted",
    "rejected",
]);

export const orders = pgTable("orders", {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    creator_id: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    comments: text(),
    status: orderStatusEnum().notNull(),
    paused: boolean().notNull(),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp().notNull().defaultNow(),
});

export const selectOrdersSchema = createSelectSchema(orders);
export const insertOrdersSchema = createInsertSchema(orders);
export const patchOrdersSchema = insertOrdersSchema.partial();

export default orders;
