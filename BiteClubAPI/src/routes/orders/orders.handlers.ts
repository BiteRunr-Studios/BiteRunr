import db from "@/db/index";
import {
    insertOrdersDTOSchema,
    insertOrdersSchema,
    orders,
} from "@/db/schema/orders";
import { type orderItems, items } from "@/db/schema/index";
import { orderLocationsWithLocationNameSchema } from "@/db/schema/orderLocations";
import type {
    CreateRoute,
    GetOneRoute,
    ListByUserIdRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
    ListCompletedByUserIdRoute,
    OrderItemsCountRoute,
    AllOrderLocationsRoute,
    LocationItemsRoute,
    ChangeOrderUserStatusRoute,
} from "./orders.routes";
import { sql } from "drizzle-orm";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq, and } from "drizzle-orm";
import { orderLocations, orderUsers } from "@/db/schema";
import { insertOrderLocationsSchema } from "@/db/schema/orderLocations";
import { insertOrderUsersSchema } from "@/db/schema/orderUsers";
import { z } from "zod";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const orders = await db.query.orders.findMany();

    return c.json(orders);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newCompleteOrder = c.req.valid("json");

    const { order_users, order_locations, ...newOrder } = newCompleteOrder;

    // 1. Add creator to order_users
    const creatorUserId = newOrder.creator_id!;
    order_users.push({ user_id: creatorUserId });

    let newOrder_parsed = insertOrdersSchema.parse(newOrder);

    const [insertedOrder] = await db
        .insert(orders)
        .values(newOrder_parsed)
        .returning();

    // Populate order_users and order_locations with order_id
    order_users.forEach((ou) => {
        ou.order_id = insertedOrder.id;
    });
    order_locations.forEach((ol) => {
        ol.order_id = insertedOrder.id;
    });

    let order_locations_parsed = z
        .array(insertOrderLocationsSchema)
        .parse(order_locations);

    let order_users_parsed = z.array(insertOrderUsersSchema).parse(order_users);

    const insertedOrderLocations = await db
        .insert(orderLocations)
        .values(order_locations_parsed)
        .returning();

    const insertedOrderUsers = await db
        .insert(orderUsers)
        .values(order_users_parsed)
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
    const { user_id } = c.req.valid("param");

    const orderUserEntries = await db.query.orderUsers.findMany({
        where(fields, operators) {
            return operators.eq(fields.user_id, user_id);
        },
        columns: { order_id: true },
    });
    const orderIds = orderUserEntries.map((entry) => entry.order_id);

    const orders = await db.query.orders.findMany({
        where(fields, operators) {
            return operators.or(
                operators.eq(fields.creator_id, user_id),
                operators.inArray(fields.id, orderIds)
            );
        },
        orderBy: (fields, operators) => [operators.desc(fields.created_at)],
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

export const listCompletedByUserId: AppRouteHandler<
    ListCompletedByUserIdRoute
> = async (c) => {
    const { user_id } = c.req.valid("param");

    const orderUserEntries = await db.query.orderUsers.findMany({
        where(fields, operators) {
            return operators.eq(fields.user_id, user_id);
        },
        columns: { order_id: true },
    });
    const orderIds = orderUserEntries.map((entry) => entry.order_id);

    const orders = await db.query.orders.findMany({
        where(fields, operators) {
            return operators.and(
                operators.or(
                    operators.eq(fields.creator_id, user_id),
                    operators.inArray(fields.id, orderIds)
                ),
                operators.eq(fields.status, "completed")
            );
        },
        orderBy: (fields, operators) => [operators.desc(fields.created_at)],
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

export const orderItemsCount: AppRouteHandler<OrderItemsCountRoute> = async (
    c
) => {
    const { order_id } = c.req.valid("param");
    const order_locations = await db.query.orderLocations.findMany({
        where(fields, operators) {
            return operators.eq(fields.order_id, order_id);
        },
    });

    if (!order_locations) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    let orderItemsCount = 0;

    for (const order_location of order_locations) {
        const order_location_items = await db.query.orderItems.findMany({
            where(fields, operators) {
                return operators.eq(
                    fields.order_location_id,
                    order_location.id
                );
            },
        });
        orderItemsCount += order_location_items.length;
    }

    return c.json({ count: orderItemsCount }, HttpStatusCodes.OK);
};

export const allOrderLocations: AppRouteHandler<
    AllOrderLocationsRoute
> = async (c) => {
    const { order_id } = c.req.valid("param");

    const order_locations = await db.query.orderLocations.findMany({
        where(fields, operators) {
            return operators.eq(fields.order_id, order_id);
        },
    });

    const locations = await db.query.locations.findMany({
        where(fields, operators) {
            return operators.inArray(
                fields.id,
                order_locations.map((ol) => ol.location_id)
            );
        },
    });

    // Custom object to return with only order_location_id and location name
    const order_locations_with_location_name = order_locations.map((ol) => {
        const location = locations.find((l) => l.id === ol.location_id);
        return { order_location_id: ol.id, location_name: location?.name };
    });

    if (!locations) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    if (!order_locations) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const order_locations_with_location_name_parsed = z
        .array(orderLocationsWithLocationNameSchema)
        .parse(order_locations_with_location_name);

    return c.json(
        order_locations_with_location_name_parsed,
        HttpStatusCodes.OK
    );
};

export const locationItems: AppRouteHandler<LocationItemsRoute> = async (c) => {
    const { location_id } = c.req.valid("param");
    const { searchQuery } = c.req.valid("query");

    const items_results = await db.query.items.findMany({
        where: sql`
            (${items.searchVector} @@ websearch_to_tsquery('english', ${searchQuery}))
            OR (similarity(${items.name}, ${searchQuery}) > 0.3)
        `,
        orderBy: sql`GREATEST(similarity(${items.name}, ${searchQuery}), 0) DESC`,
    });

    return c.json(items_results, HttpStatusCodes.OK);
};

export const changeOrderUserStatus: AppRouteHandler<
    ChangeOrderUserStatusRoute
> = async (c) => {
    const { order_id, user_id } = c.req.valid("param");
    const { status } = c.req.valid("json");

    const [updatedOrder] = await db
        .update(orderUsers)
        .set({ status })
        .where(
            and(
                eq(orderUsers.order_id, order_id),
                eq(orderUsers.user_id, user_id)
            )
        )
        .returning();

    if (!updatedOrder) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedOrder.status, HttpStatusCodes.OK);
};
