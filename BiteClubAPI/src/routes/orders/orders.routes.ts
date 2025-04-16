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
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";
import { authMiddleware } from "@/middlewares/clerk-auth";

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
    path: "/orders/{id}",
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
    path: "/orders/{id}",
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
    path: "/orders/{id}",
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

export const listByUserId = createRoute({
    path: "/orders/user/{id}",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
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

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type ListByUserIdRoute = typeof listByUserId;
