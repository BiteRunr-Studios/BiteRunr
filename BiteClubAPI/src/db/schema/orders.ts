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
import { sql, relations } from "drizzle-orm";
import { orderUsers, orderLocations, users } from "./index";
import { selectOrderLocationsSchema } from "./orderLocations";
import { selectOrderUsersSchema } from "./orderUsers";

export const orderStatusEnum = pgEnum("order_status_enum", [
    "created",
    "active",
    "completed",
    "cancelled",
]);

export const orders = pgTable("orders", {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    creator_id: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    comments: text(),
    status: orderStatusEnum().notNull().default("created"),
    paused: boolean().notNull().default(false),
    created_at: timestamp().notNull().defaultNow(),
    updated_at: timestamp()
        .notNull()
        .defaultNow()
        .$onUpdateFn(() => new Date()),
}).enableRLS();

export const ordersRelations = relations(orders, ({ one, many }) => ({
    creator: one(users, {
        fields: [orders.creator_id],
        references: [users.id],
    }),
    orderLocations: many(orderLocations),
    orderUsers: many(orderUsers),
}));

export const selectOrdersSchema = createSelectSchema(orders).extend({
    orderLocations: selectOrderLocationsSchema.optional(),
    orderUsers: selectOrderUsersSchema.optional(),
});
export const insertOrdersSchema = createInsertSchema(orders).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const patchOrdersSchema = insertOrdersSchema.partial();

export default orders;
