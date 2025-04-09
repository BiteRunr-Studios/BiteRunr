import db from "@/db/index.js";
import type { ListRoute } from "./users.routes.js";
import type { AppRouteHandler } from "@/lib/types.js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const users = (await db.query.user.findMany()) as {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
    }[];
    return c.json(users);
};
