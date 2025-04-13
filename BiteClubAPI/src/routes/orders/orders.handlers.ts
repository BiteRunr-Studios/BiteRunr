import db from "@/db/index";
import { orders } from "@/db/schema/orders";
import type {
    CreateRoute,
    GetOneRoute,
    ListByUserIdRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./orders.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectOrdersSchema } from "@/db/schema/orders";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const orders = await db.query.orders.findMany();

    return c.json(orders);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newOrder = c.req.valid("json");
    const [inserted] = await db.insert(orders).values(newOrder).returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const order = await db.query.orders.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!order) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(order, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedOrder] = await db
        .update(orders)
        .set(updates)
        .where(eq(orders.id, id))
        .returning();

    if (!updatedOrder) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedOrder, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const [deletedOrder] = await db
        .delete(orders)
        .where(eq(orders.id, id))
        .returning();

    if (!deletedOrder) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedOrder, HttpStatusCodes.OK);
};

export const listByUserId: AppRouteHandler<ListByUserIdRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const orders = await db.query.orders.findMany({
        where(fields, operators) {
            return operators.eq(fields.creator_id, id);
        },
    });

    if (!orders) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(orders, HttpStatusCodes.OK);
};
