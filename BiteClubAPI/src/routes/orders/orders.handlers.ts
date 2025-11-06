import db from "@/db/index";
import {
    insertOrdersDTOSchema,
    insertOrdersSchema,
    orders,
} from "@/db/schema/orders";
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
    AddNewItemAndLinkToOrderUserRoute,
    AddItemAndLinkToOrderUserRoute,
    AwaitingOrderRoute,
    UserOrderItemsFromLocationRoute,
    EditOrderItemsRoute,
    RemoveOrderItemRoute,
    GetUserOrderDetailsRoute,
    UserRecentItemsRoute,
} from "./orders.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { sql, eq, and, isNull, ne } from "drizzle-orm";
import { orderLocations, orderUsers, items } from "@/db/schema";
import { orderItems } from "@/db/schema/orderItems";
import { insertOrderLocationsSchema } from "@/db/schema/orderLocations";
import { insertOrderUsersSchema } from "@/db/schema/orderUsers";
import { z } from "zod";
import { omit } from "@/lib/reusable-functions";

// Helper function to format timestamp to readable format
const formatTimestamp = (timestamp: Date): string => {
    const date = new Date(timestamp);

    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];

    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;

    return `${month} ${day}, ${year} · ${hours}:${minutesStr} ${ampm}`;
};

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
        return {
            location_id: ol.location_id,
            order_location_id: ol.id,
            location_name: location?.name,
        };
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
            ${items.location_id} = ${location_id}
            AND (
                (${items.searchVector} @@ websearch_to_tsquery('english', ${searchQuery}))
                OR (similarity(${items.name}, ${searchQuery}) > 0.3)
            )
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

export const addNewItemAndLinkToOrderUser: AppRouteHandler<
    AddNewItemAndLinkToOrderUserRoute
> = async (c) => {
    const { order_id, order_location_id } = c.req.valid("param");
    const { order_user_id, new_item, quantity, comments } = c.req.valid("json");

    console.log("Raw request body", c.req.json());

    const [insertedItem] = await db.insert(items).values(new_item).returning();

    const [insertedOrderItem] = await db
        .insert(orderItems)
        .values({
            order_location_id,
            order_user_id,
            item_id: insertedItem.id,
            comments,
            quantity,
        })
        .returning();

    return c.json(insertedOrderItem, HttpStatusCodes.OK);
};

export const addItemAndLinkToOrderUser: AppRouteHandler<
    AddItemAndLinkToOrderUserRoute
> = async (c) => {
    const newOrderItem = c.req.valid("json");

    const itemId = newOrderItem.item_id;
    const orderUserId = newOrderItem.order_user_id;
    const quantityToAdd = newOrderItem.quantity;
    const comments = newOrderItem.comments ?? null;

    const normalizedComment =
        comments === null ? null : comments.toLowerCase().replace(/\s+/g, "");

    let existingOrderItemQuery;

    if (comments === null) {
        // Find where comments IS NULL
        existingOrderItemQuery = await db
            .select()
            .from(orderItems)
            .where(
                and(
                    eq(orderItems.item_id, itemId),
                    eq(orderItems.order_user_id, orderUserId),
                    isNull(orderItems.comments)
                )
            )
            .limit(1);
    } else {
        // Find where comments = newOrderItem.comments
        existingOrderItemQuery = await db
            .select()
            .from(orderItems)
            .where(
                and(
                    eq(orderItems.item_id, itemId),
                    eq(orderItems.order_user_id, orderUserId),
                    eq(
                        sql`LOWER(REGEXP_REPLACE(${orderItems.comments}, '\\s+', '', 'g'))`,
                        normalizedComment
                    )
                )
            )
            .limit(1);
    }

    const existingOrderItem = existingOrderItemQuery[0];

    if (existingOrderItem) {
        const updatedQuantity = existingOrderItem.quantity + quantityToAdd;

        const [updatedOrderItem] = await db
            .update(orderItems)
            .set({ quantity: updatedQuantity })
            .where(eq(orderItems.id, existingOrderItem.id))
            .returning();

        return c.json(updatedOrderItem, HttpStatusCodes.OK);
    }

    const [insertedOrderItem] = await db
        .insert(orderItems)
        .values({
            ...newOrderItem,
            comments, // ensure null is set if missing
        })
        .returning();

    return c.json(insertedOrderItem, HttpStatusCodes.OK);
};

export const awaitingOrder: AppRouteHandler<AwaitingOrderRoute> = async (c) => {
    const { order_id } = c.req.valid("json");

    // order items count
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

    // get order users
    const orderUsers = await db.query.orderUsers.findMany({
        where(fields, operators) {
            return operators.eq(fields.order_id, order_id);
        },
        with: {
            user: {
                columns: {
                    id: false,
                },
            },
        },
    });

    if (!orderUsers) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    // get order
    const order = await db.query.orders.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, order_id);
        },
        with: {
            orderLocations: true,
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

    const orderLocations = order.orderLocations;
    const orderWithoutLocations = omit(order, "orderLocations");

    return c.json(
        {
            count: orderItemsCount,
            order_users: orderUsers,
            order: orderWithoutLocations,
            order_locations: orderLocations,
        },
        HttpStatusCodes.OK
    );
};

export const userOrderItemsFromLocation: AppRouteHandler<
    UserOrderItemsFromLocationRoute
> = async (c) => {
    const { order_location_id, order_user_id } = c.req.valid("param");

    const orderItems = await db.query.orderItems.findMany({
        where(fields, operators) {
            return operators.and(
                operators.eq(fields.order_location_id, order_location_id),
                operators.eq(fields.order_user_id, order_user_id)
            );
        },
        orderBy: (fields, operators) => [operators.desc(fields.created_at)],
        with: {
            item: {
                columns: {
                    searchVector: false,
                },
            },
        },
    });

    if (!orderItems) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(orderItems, HttpStatusCodes.OK);
};

export const editOrderItems: AppRouteHandler<EditOrderItemsRoute> = async (
    c
) => {
    const { order_item_id } = c.req.valid("param");
    const updated_order_item = c.req.valid("json");
    const comments = updated_order_item.comments ?? null;

    // Normalize comments for comparison
    const normalizedComments =
        comments === null ? null : comments.toLowerCase().replace(/\s+/g, "");

    const [existingOrderItem] = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, order_item_id))
        .limit(1);

    let matchingOrderItemQuery;

    if (normalizedComments === null) {
        matchingOrderItemQuery = await db
            .select()
            .from(orderItems)
            .where(
                and(
                    eq(orderItems.item_id, existingOrderItem.item_id),
                    eq(
                        orderItems.order_user_id,
                        existingOrderItem.order_user_id
                    ),
                    isNull(orderItems.comments),
                    ne(orderItems.id, order_item_id) // Exclude the item being edited
                )
            )
            .limit(1);
    } else {
        matchingOrderItemQuery = await db
            .select()
            .from(orderItems)
            .where(
                and(
                    eq(orderItems.item_id, existingOrderItem.item_id),
                    eq(
                        orderItems.order_user_id,
                        existingOrderItem.order_user_id
                    ),
                    eq(
                        sql`LOWER(REGEXP_REPLACE(${orderItems.comments}, '\\s+', '', 'g'))`,
                        normalizedComments
                    ),
                    ne(orderItems.id, order_item_id) // Exclude the item being edited
                )
            )
            .limit(1);
    }

    const matchingOrderItem = matchingOrderItemQuery[0];

    if (matchingOrderItem) {
        // Merge quantities
        const mergedQuantity =
            matchingOrderItem.quantity + updated_order_item.quantity;

        // Update the matching item with the merged quantity
        const [updatedMatchingOrderItem] = await db
            .update(orderItems)
            .set({ quantity: mergedQuantity })
            .where(eq(orderItems.id, matchingOrderItem.id))
            .returning();

        // Delete the item being edited
        await db.delete(orderItems).where(eq(orderItems.id, order_item_id));

        return c.json(updatedMatchingOrderItem, HttpStatusCodes.OK);
    }

    // No match found, update as usual
    const [updatedOrderItem] = await db
        .update(orderItems)
        .set(updated_order_item)
        .where(eq(orderItems.id, order_item_id))
        .returning();

    if (!updatedOrderItem) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedOrderItem, HttpStatusCodes.OK);
};

export const removeOrderItem: AppRouteHandler<RemoveOrderItemRoute> = async (
    c
) => {
    const { order_item_id } = c.req.valid("param");

    const [deletedOrderItem] = await db
        .delete(orderItems)
        .where(eq(orderItems.id, order_item_id))
        .returning();

    if (!deletedOrderItem) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedOrderItem, HttpStatusCodes.OK);
};

export const getUserOrderDetails: AppRouteHandler<
    GetUserOrderDetailsRoute
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
                operators.eq(fields.status, "completed"),
                operators.or(
                    operators.eq(fields.creator_id, user_id),
                    operators.inArray(fields.id, orderIds)
                )
            );
        },
        orderBy: (fields, operators) => [operators.desc(fields.created_at)],
    });

    const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
            const orderUsers = await db.query.orderUsers.findMany({
                where(fields, operators) {
                    return operators.eq(fields.order_id, order.id);
                },
                with: {
                    user: {
                        columns: {
                            id: false,
                        },
                    },
                },
            });

            const orderLocations = await db.query.orderLocations.findMany({
                where(fields, operators) {
                    return operators.eq(fields.order_id, order.id);
                },
            });

            let itemsCount = 0;
            for (const orderLocation of orderLocations) {
                const locationItems = await db.query.orderItems.findMany({
                    where(fields, operators) {
                        return operators.eq(
                            fields.order_location_id,
                            orderLocation.id
                        );
                    },
                });
                itemsCount += locationItems.length;
            }

            return {
                order: {
                    ...order,
                    created_at: formatTimestamp(order.created_at),
                    updated_at: formatTimestamp(order.updated_at),
                },
                order_users: orderUsers,
                items_count: itemsCount,
                people_count: orderUsers.length,
            };
        })
    );

    return c.json(ordersWithDetails, HttpStatusCodes.OK);
};

export const userRecentItems: AppRouteHandler<UserRecentItemsRoute> = async (
    c
) => {
    const { user_id } = c.req.valid("param");

    const userOrderUsers = await db.query.orderUsers.findMany({
        where(fields, operators) {
            return operators.eq(fields.user_id, user_id);
        },
        columns: { id: true },
    });

    if (userOrderUsers.length === 0) {
        return c.json([], HttpStatusCodes.OK);
    }

    const orderUserIds = userOrderUsers.map((ou) => ou.id);

    const userOrderItems = await db.query.orderItems.findMany({
        where(fields, operators) {
            return operators.inArray(fields.order_user_id, orderUserIds);
        },
        orderBy: (fields, operators) => [operators.desc(fields.created_at)],
        with: {
            item: {
                columns: {
                    searchVector: false,
                },
                with: {
                    location: {
                        columns: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    const seenItemIds = new Set<string>();
    const recentUniqueItems: typeof userOrderItems = [] as any;

    for (const oi of userOrderItems) {
        if (!seenItemIds.has(oi.item_id)) {
            seenItemIds.add(oi.item_id);
            recentUniqueItems.push(oi);
        }
        if (recentUniqueItems.length === 3) break;
    }

    const itemsWithRestaurant = recentUniqueItems.map((oi) => ({
        ...oi.item,
        created_at: formatTimestamp(oi.created_at),
        updated_at: formatTimestamp(oi.updated_at),
        restaurant_name: oi.item.location?.name || null,
    }));
    return c.json(itemsWithRestaurant, HttpStatusCodes.OK);
};
