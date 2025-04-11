import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
    insertOrdersSchema,
    patchOrdersSchema,
    selectOrdersSchema,
} from "@/db/schema/orders";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Orders"];

export const list = createRoute({
    path: "/orders",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrdersSchema),
            "List of order items"
        ),
    },
});

export const create = createRoute({
    path: "/orders",
    method: "post",
    tags,
    request: {
        body: jsonContentRequired(
            insertOrdersSchema,
            "Create an order"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrdersSchema,
            "Create an order"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertOrdersSchema),
            "Validation error(s)"
        ),
    },
});

export const getOne = createRoute({
    path: "/orders/{id}",
    method: "get",
    tags,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrdersSchema,
            "Order by Id"
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

export const patch = createRoute({
    path: "/orders/{id}",
    method: "patch",
    tags,
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

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
