import { pgTable, integer, serial, timestamp } from "drizzle-orm/pg-core";
// @ts-ignore
import orderGroups from "./orderGroups";
// @ts-ignore
import { user } from "./user";

export const groupMembers = pgTable("group_members", {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").references(() => orderGroups.id),
    userId: integer("user_id").references(() => user.id),
    joinedAt: timestamp("joined_at").defaultNow(),
});

export default groupMembers;
