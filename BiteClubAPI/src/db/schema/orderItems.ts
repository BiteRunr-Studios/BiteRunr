import { pgTable, integer, serial } from "drizzle-orm/pg-core";
import { items } from "./items.js";
import { orderGroups } from "./orderGroups.js";
import { user } from "./user.js";

export const orderItems = pgTable("order_items", {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").references(() => orderGroups.id),
    itemId: integer("item_id").references(() => items.id),
    userId: integer("user_id").references(() => user.id),
    quantity: integer("quantity").default(1),
});

export default orderItems;
