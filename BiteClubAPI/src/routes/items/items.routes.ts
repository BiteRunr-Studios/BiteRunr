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

const tags = ["Items"];

export const list = createRoute({
    path: "/items",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrderItemsSchema),
            "List of order items"
        ),
    },
});

export const create = createRoute({
    path: "/items",
    method: "post",
    tags,
    request: {
        body: jsonContentRequired(
            insertOrderItemsSchema,
            "Create an order item"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Create an order item"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertOrderItemsSchema),
            "Validation error(s)"
        ),
    },
});

export const getOne = createRoute({
    path: "/items/{id}",
    method: "get",
    tags,
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
    },
});

export const patch = createRoute({
    path: "/items/{id}",
    method: "patch",
    tags,
    request: {
        params: IdUUIDParamsSchema,
        body: jsonContentRequired(patchOrderItemsSchema, "Update a user"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderItemsSchema,
            "Update an order item"
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

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
