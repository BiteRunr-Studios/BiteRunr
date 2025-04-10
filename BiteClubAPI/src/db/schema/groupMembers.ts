import { pgTable, integer, serial, timestamp } from "drizzle-orm/pg-core";
import orderGroups from "./orderGroups.js";
import { user } from "./user.js";

export const groupMembers = pgTable("group_members", {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").references(() => orderGroups.id),
    userId: integer("user_id").references(() => user.id),
    joinedAt: timestamp("joined_at").defaultNow(),
});

export default groupMembers;
