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
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";
import { orderLocations, orderUsers } from "@/db/schema";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const orders = await db.query.orders.findMany();

    return c.json(orders);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newCompleteOrder = c.req.valid("json");

    const { clerk_id, order_users, order_locations, ...newOrder } =
        newCompleteOrder;

    const user = await db.query.users.findFirst({
        where(fields, operators) {
            return operators.eq(fields.clerk_id, clerk_id);
        },
    });

    if (!user) {
        return c.json(
            {
                message: "User not found",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    newOrder.creator_id = user.id;

    const [insertedOrder] = await db
        .insert(orders)
        .values(newOrder)
        .returning();

    // Populate order_users and order_locations with order_id
    order_users.forEach((ou) => {
        ou.order_id = insertedOrder.id;
    });
    order_locations.forEach((ol) => {
        ol.order_id = insertedOrder.id;
    });

    const insertedOrderLocations = await db
        .insert(orderLocations)
        .values(order_locations)
        .returning();

    const insertedOrderUsers = await db
        .insert(orderUsers)
        .values(order_users)
        .returning();

    if (insertedOrderLocations.length == 0 || insertedOrderUsers.length == 0) {
        return c.json(
            {
                message:
                    "Order locations and/or order users could not be added",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    return c.json(insertedOrder, HttpStatusCodes.OK);
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
