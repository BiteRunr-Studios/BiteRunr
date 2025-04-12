import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
    insertOrderItemsSchema,
    patchOrderItemsSchema,
    selectOrderItemsSchema,
} from "@/db/schema/orderItems";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";
import { authMiddleware } from "@/middlewares/clerk-auth";

const tags = ["Order Items"];

export const list = createRoute({
    path: "/order-items",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrderItemsSchema),
            "List of order items"
        ),
        [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({
                message: z.string(),
            }),
            "Unauthorized: Missing token"
        ),
    },
});

export const create = createRoute({
    path: "/order-items",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(
            insertOrderItemsSchema,
            "Create an order item"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Created order item"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertOrderItemsSchema),
            "Validation error(s)"
        ),
        [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({
                message: z.string(),
            }),
            "Unauthorized: Missing token"
        ),
    },
});

export const getOne = createRoute({
    path: "/order-items/{id}",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Order item by Id"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order item not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
        [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({
                message: z.string(),
            }),
            "Unauthorized: Missing token"
        ),
    },
});

export const patch = createRoute({
    path: "/order-items/{id}",
    method: "patch",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
        body: jsonContentRequired(
            patchOrderItemsSchema,
            "Update an order item"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Updated order item"
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
        [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({
                message: z.string(),
            }),
            "Unauthorized: Missing token"
        ),
    },
});

export const remove = createRoute({
    path: "/order-items/{id}",
    method: "delete",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Deleted order item"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order item not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
        [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({
                message: z.string(),
            }),
            "Unauthorized: Missing token"
        ),
    },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
