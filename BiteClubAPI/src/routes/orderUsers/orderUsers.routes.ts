import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import orderUsers, {
    insertOrderUsersSchema,
    patchOrderUsersSchema,
    selectOrderUsersSchema,
} from "@/db/schema/orderUsers";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";
import { authMiddleware } from "@/middlewares/clerk-auth";
import { selectUserSchema } from "@/db/schema/users";

const tags = ["Order Users"];

export const list = createRoute({
    path: "/order-users",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrderUsersSchema),
            "List of order users"
        ),
    },
});

export const create = createRoute({
    path: "/order-users",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(
            insertOrderUsersSchema,
            "Create an order user"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderUsersSchema,
            "Created order user"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertOrderUsersSchema),
            "Validation error(s)"
        ),
    },
});

export const getOne = createRoute({
    path: "/order-users/{id}",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderUsersSchema,
            "Order user by Id"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order user not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const patch = createRoute({
    path: "/order-users/{id}",
    method: "patch",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
        body: jsonContentRequired(
            patchOrderUsersSchema,
            "Update an order user"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderUsersSchema,
            "Updated order user"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order user not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchOrderUsersSchema),
                createErrorSchema(IdUUIDParamsSchema),
            ],
            "Validation error(s)"
        ),
    },
});

export const remove = createRoute({
    path: "/order-users/{id}",
    method: "delete",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderUsersSchema,
            "Deleted order user"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order user not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const getOrderUsers = createRoute({
    path: "/orders/{id}/users",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectUserSchema),
            "List of users in the order"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order or users not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});


export type GetOrderUsersRoute = typeof getOrderUsers;
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
