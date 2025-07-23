import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
    insertOrdersDTOSchema,
    insertOrdersSchema,
    patchOrdersSchema,
    selectOrdersSchema,
} from "@/db/schema/orders";
import { selectOrderUsersWithUserSchema } from "@/db/schema/users";
import { selectItemSchema, insertItemSchema } from "@/db/schema/items";
import {
    orderLocationsWithLocationNameSchema,
    selectOrderLocationsSchema,
} from "@/db/schema/orderLocations";
import {
    selectOrderItemsSchema,
    insertOrderItemsSchema,
    patchOrderItemsSchema,
} from "@/db/schema/orderItems";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";
import { authMiddleware } from "@/middlewares/clerk-auth";
import { boolean } from "drizzle-orm/gel-core";

const tags = ["Orders"];

export const list = createRoute({
    path: "/orders",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrdersSchema),
            "List of orders"
        ),
    },
});

export const create = createRoute({
    path: "/orders",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(insertOrdersDTOSchema, "Create an order"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrdersSchema,
            "Create an order"
        ),
        [HttpStatusCodes.BAD_REQUEST]: jsonContent(
            z.object({
                message: z.string(),
            }),
            "Order locations and/or order users could not be added"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertOrdersDTOSchema),
            "Validation error(s)"
        ),
    },
});

export const getOne = createRoute({
    path: "/orders/:id",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(selectOrdersSchema, "Order by Id"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const patch = createRoute({
    path: "/orders/:id",
    method: "patch",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
        body: jsonContentRequired(patchOrdersSchema, "Update a user"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrdersSchema,
            "Update an order"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchOrdersSchema),
                createErrorSchema(IdUUIDParamsSchema),
            ],
            "Validation error(s)"
        ),
    },
});

export const remove = createRoute({
    path: "/orders/:id",
    method: "delete",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(selectOrdersSchema, "Deleted order"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const isUserInActiveOrder = createRoute({
    path: "/order/has-user",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(
            z.object({
                order_id: z
                    .string()
                    .uuid()
                    .nonempty("Order id is required")
                    .pipe(z.string().uuid()),
                user_id: z
                    .string()
                    .uuid()
                    .nonempty("User id is required")
                    .pipe(z.string().uuid()),
            }),
            "Order and user id"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.object({
                is_user_in_order: z.boolean(),
            }),
            "Is user in order?"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(
                z.object({
                    order_id: z
                        .string()
                        .nonempty("Order id is required")
                        .pipe(z.string().uuid()),
                    user_id: z
                        .string()
                        .nonempty("User id is required")
                        .pipe(z.string().uuid()),
                })
            ),
            "Invalid Ids"
        ),
    },
});

export const listByUserId = createRoute({
    path: "/orders/user/:user_id",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            user_id: z.string().uuid().nonempty("User id is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrdersSchema),
            "User's list of orders"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "User's orders not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const listCompletedByUserId = createRoute({
    path: "/orders/user/:user_id/completed",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            user_id: z.string().uuid().nonempty("User id is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrdersSchema),
            "User's list of completed orders"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "User's completed orders not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const orderItemsCount = createRoute({
    path: "/orders/:order_id/items/count",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            order_id: z.string().uuid().nonempty("Order id is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.object({ count: z.number() }),
            "Order items count"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order items not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const allOrderLocations = createRoute({
    path: "/orders/:order_id/locations",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            order_id: z.string().uuid().nonempty("Order id is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(orderLocationsWithLocationNameSchema),
            "All locations in an order"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const locationItems = createRoute({
    path: "/items/:location_id",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            location_id: z.string().uuid().nonempty("Location id is required"),
        }),
        query: z.object({
            searchQuery: z.string().nonempty("Search query is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectItemSchema),
            "All items in the location"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Location not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const changeOrderUserStatus = createRoute({
    path: "/orders/:order_id/users/:user_id/change-status",
    method: "patch",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            order_id: z.string().uuid().nonempty("Order id is required"),
            user_id: z.string().uuid().nonempty("User id is required"),
        }),
        body: jsonContentRequired(
            z.object({
                status: z.enum(["ordering", "done"]),
            }),
            "Update user ordering status"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.enum(["ordering", "done"]),
            "Update an order"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchOrdersSchema),
                createErrorSchema(IdUUIDParamsSchema),
            ],
            "Validation error(s)"
        ),
    },
});

export const addNewItemAndLinkToOrderUser = createRoute({
    path: "/orders/:order_id/locations/:order_location_id/items",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            order_id: z.string().uuid().nonempty("Order id is required"),
            order_location_id: z
                .string()
                .uuid()
                .nonempty("Order location id is required"),
        }),
        body: jsonContentRequired(
            z.object({
                order_user_id: z
                    .string()
                    .uuid()
                    .nonempty("Order user id is required"),
                new_item: insertItemSchema,
                quantity: z.number().min(1).max(100),
                comments: z.string(),
            }),
            "Create an item and add to order user"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Created an item and linked to order user"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertItemSchema),
            "Validation error(s)"
        ),
    },
});

export const addItemAndLinkToOrderUser = createRoute({
    path: "/orders/add_items_to_order_user",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(
            insertOrderItemsSchema,
            "Add order item to order user"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Added item to order user"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertItemSchema),
            "Validation error(s)"
        ),
    },
});

export const awaitingOrder = createRoute({
    path: "/orders/awaiting_order",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(
            z.object({
                order_id: z.string().uuid().nonempty("Order id is required"),
            }),
            "Get awaiting order page data"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.object({
                count: z.number(),
                order_users: z.array(selectOrderUsersWithUserSchema),
                order: selectOrdersSchema,
                order_locations: z.array(selectOrderLocationsSchema),
            }),
            "All items in the location"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Not found"),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const userOrderItemsFromLocation = createRoute({
    path: "/orders/locations/:order_location_id/users/:order_user_id/items",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            order_location_id: z
                .string()
                .uuid()
                .nonempty("Order location id is required"),
            order_user_id: z
                .string()
                .uuid()
                .nonempty("Order user id is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrderItemsSchema),
            "All items from a user in a location"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Not found"),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const editOrderItems = createRoute({
    path: "/orders/order-items/:order_item_id",
    method: "patch",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            order_item_id: z
                .string()
                .uuid()
                .nonempty("Order item id is required"),
        }),
        body: jsonContentRequired(
            patchOrderItemsSchema,
            "Update user ordering status"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Updated an order item"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order item not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchOrderItemsSchema),
                createErrorSchema(IdUUIDParamsSchema),
            ],
            "Validation error(s)"
        ),
    },
});

export const removeOrderItem = createRoute({
    path: "/orders/order-items/:order_item_id",
    method: "delete",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            order_item_id: z
                .string()
                .uuid()
                .nonempty("Order item id is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Deleted order item"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            " Order item not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type ListByUserIdRoute = typeof listByUserId;
export type ListCompletedByUserIdRoute = typeof listCompletedByUserId;
export type OrderItemsCountRoute = typeof orderItemsCount;
export type AllOrderLocationsRoute = typeof allOrderLocations;
export type LocationItemsRoute = typeof locationItems;
export type ChangeOrderUserStatusRoute = typeof changeOrderUserStatus;
export type AddNewItemAndLinkToOrderUserRoute =
    typeof addNewItemAndLinkToOrderUser;
export type AddItemAndLinkToOrderUserRoute = typeof addItemAndLinkToOrderUser;
export type AwaitingOrderRoute = typeof awaitingOrder;
export type UserOrderItemsFromLocationRoute = typeof userOrderItemsFromLocation;
export type EditOrderItemsRoute = typeof editOrderItems;
export type RemoveOrderItemRoute = typeof removeOrderItem;
