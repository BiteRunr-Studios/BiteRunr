import { pgTable, timestamp, uuid, unique, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orderItems } from "./index";
import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const items = pgTable(
    "items",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: varchar().notNull(),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => new Date()),
    },
    (t) => [unique().on(t.name)]
).enableRLS();

export const itemsRelations = relations(items, ({ many }) => ({
    orderItems: many(orderItems),
}));

export const selectItemSchema = createSelectSchema(items);

// .extend({
//  order_items: selectOrderItemsSchema.optional(),
// })

export const insertItemSchema = createInsertSchema(items)
    .extend({
        name: z.string().nonempty("Name is required"),
    })
    .omit({
        id: true,
        created_at: true,
        updated_at: true,
    });
export const patchItemSchema = insertItemSchema.partial();

export default items;
