import db from "@/db/index";
import { orderItems } from "@/db/schema/orderItems";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
    GetByOrderLocationIdRoute,
} from "./orderItems.routes";
import type { AppRouteHandler, GroupedItem } from "@/lib/types";
import { GroupedItemSchema } from "@/lib/types";
import { selectOrderItemsSchema } from "@/db/schema/orderItems";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const items = await db.query.orderItems.findMany();

    return c.json(items);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newItem = c.req.valid("json");
    const [inserted] = await db.insert(orderItems).values(newItem).returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const item = await db.query.orderItems.findFirst({
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
        .update(orderItems)
        .set(updates)
        .where(eq(orderItems.id, id))
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
        .delete(orderItems)
        .where(eq(orderItems.id, id))
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

export const getByOrderLocationId: AppRouteHandler<
    GetByOrderLocationIdRoute
> = async (c) => {
    const { id } = c.req.valid("param");

    const items = await db.query.orderItems.findMany({
        where(fields, operators) {
            return operators.eq(fields.order_location_id, id);
        },
        with: {
            item: {
                columns: {
                    id: false,
                    searchVector: false,
                    updated_at: false,
                    created_at: false,
                    location_id: false,
                },
            },
        },
    });

    const transformedItems = items.map(({ item, ...rest }) => ({
        ...rest,
        item_name: item.name,
    }));

    const groupedMap = new Map<string, GroupedItem>();

    for (const item of transformedItems) {
        if (!groupedMap.has(item.item_id)) {
            groupedMap.set(item.item_id, {
                item_id: item.item_id,
                item_name: item.item_name,
                total_quantity: 0,
                requests: [],
            });
        }

        const group = groupedMap.get(item.item_id)!;
        group.total_quantity += item.quantity;
        // Only add to requests if comments is not null
        if (item.comments) {
            group.requests.push({
                comment: item.comments,
                quantity: item.quantity,
            });
        }
    }

    if (!Array.from(groupedMap.values())) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const parsedItems = z
        .array(GroupedItemSchema)
        .parse(Array.from(groupedMap.values()));

    return c.json(parsedItems, HttpStatusCodes.OK);
};
