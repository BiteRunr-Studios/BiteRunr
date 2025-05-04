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
import {
    insertOrderLocationsSchema,
    selectOrderLocationsSchema,
} from "./orderLocations";
import { insertOrderUsersSchema, selectOrderUsersSchema } from "./orderUsers";
import { z } from "zod";

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
    order_locations: selectOrderLocationsSchema.optional(),
    order_users: selectOrderUsersSchema.optional(),
});
export const insertOrdersSchema = createInsertSchema(orders).omit({
    id: true,
    created_at: true,
    updated_at: true,
});

export const insertOrdersDTOSchema = insertOrdersSchema
    .omit({
        creator_id: true, // Remove the original creator_id definition
    })
    .extend({
        creator_id: z.string().uuid().optional(), // Add creator_id as optional
        name: z.string().nonempty("Name is required"),
        order_locations: z
            .array(
                z.object({
                    order_id: z.string().optional(),
                    location_id: z.string().nonempty("Location Id is required"),
                })
            )
            .nonempty("At least one location required"),
        order_users: z
            .array(
                z.object({
                    order_id: z.string().optional(),
                    user_id: z.string().nonempty("User Id is required"),
                })
            )
            .nonempty("At least one friend is required"),
    });

export const patchOrdersSchema = insertOrdersSchema.partial();

export default orders;
