import db from "@/db/index";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./items.routes";
import type { AppRouteHandler } from "@/lib/types";
import items from "@/db/schema/items";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const items = await db.query.items.findMany();

    return c.json(items);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newItem = c.req.valid("json");
    const [inserted] = await db
        .insert(items)
        .values(newItem)
        .returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const item = await db.query.items.findFirst({
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

    return c.json(item, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedItem] = await db
        .update(items)
        .set(updates)
        .where(eq(items.id, id))
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

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const [deletedItem] = await db
        .delete(items)
        .where(eq(items.id, id))
        .returning();

    if (!deletedItem) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedItem, HttpStatusCodes.OK);
};
