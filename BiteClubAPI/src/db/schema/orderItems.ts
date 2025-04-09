import { pgTable, integer, serial } from "drizzle-orm/pg-core";
// @ts-ignore
import { items } from "./items";
// @ts-ignore
import { orderGroups } from "./orderGroups";
// @ts-ignore
import { user } from "./user";

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => orderGroups.id),
  itemId: integer("item_id").references(() => items.id),
  userId: integer("user_id").references(() => user.id),
  quantity: integer("quantity").default(1),
});

export default orderItems;
