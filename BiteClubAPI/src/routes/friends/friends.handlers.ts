import db from "@/db/index";
import { friends } from "@/db/schema/friends";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
} from "./friends.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectFriendsSchema } from "@/db/schema/friends";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const items = await db.query.friends.findMany();
    const validatedUsers = items.map((item) =>
        selectFriendsSchema.parse(item)
    );
    return c.json(validatedUsers);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newItem = c.req.valid("json");
    const [inserted] = await db.insert(friends).values(newItem).returning();
    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const item = await db.query.friends.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!item) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const validatedItem = selectFriendsSchema.parse(item);
    return c.json(validatedItem, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const [updatedItem] = await db
        .update(friends)
        .set(updates)
        .where(eq(friends.id, id))
        .returning();

    if (!updatedItem) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedItem, HttpStatusCodes.OK);
};
