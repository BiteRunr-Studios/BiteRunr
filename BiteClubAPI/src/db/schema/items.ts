import {
    pgTable,
    timestamp,
    uuid,
    unique,
    varchar,
    customType,
    index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { orderItems, locations } from "./index";
import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

const tsvector = customType<{ data: string }>({
    dataType() {
        return "tsvector";
    },
});

export const items = pgTable(
    "items",
    {
        id: uuid().primaryKey().defaultRandom(),
        name: varchar().notNull(),
        location_id: uuid()
            .notNull()
            .references(() => locations.id, { onDelete: "cascade" }),
        searchVector: tsvector("search_vector"),
        created_at: timestamp().notNull().defaultNow(),
        updated_at: timestamp()
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => new Date()),
    },
    (t) => [
        unique().on(t.name),
        index("items_search_vector_idx").on(t.searchVector),
    ]
).enableRLS();

export const itemsRelations = relations(items, ({ one, many }) => ({
    orderItems: many(orderItems),
    location: one(locations, {
        fields: [items.location_id],
        references: [locations.id],
    }),
}));

export const selectItemSchema = createSelectSchema(items).omit({
    searchVector: true,
});

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
        searchVector: true,
    });
export const patchItemSchema = insertItemSchema.partial();

export default items;
