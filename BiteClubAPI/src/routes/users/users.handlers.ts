import db from "@/db/index.js";
import type { ListRoute } from "./users.routes.js";
import type { AppRouteHandler } from "@/lib/types.js";
import { selectUserSchema } from "@/db/schema/user.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const users = await db.query.user.findMany();
    const validatedUsers = users.map((user) => selectUserSchema.parse(user));
    return c.json(validatedUsers);
};
