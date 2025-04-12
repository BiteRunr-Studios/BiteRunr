import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
    insertOrderLocationsSchema,
    patchOrderLocationsSchema,
    selectOrderLocationsSchema,
} from "@/db/schema/orderLocations";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Order Locations"];

export const list = createRoute({
    path: "/order-locations",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectOrderLocationsSchema),
            "List of order locations"
        ),
    },
});

export const create = createRoute({
    path: "/order-locations",
    method: "post",
    tags,
    request: {
        body: jsonContentRequired(
            insertOrderLocationsSchema,
            "Create an order location"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderLocationsSchema,
            "Created order location"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertOrderLocationsSchema),
            "Validation error(s)"
        ),
    },
});

export const getOne = createRoute({
    path: "/order-locations/{id}",
    method: "get",
    tags,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderLocationsSchema,
            "Order location by Id"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order location not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const patch = createRoute({
    path: "/order-locations/{id}",
    method: "patch",
    tags,
    request: {
        params: IdUUIDParamsSchema,
        body: jsonContentRequired(patchOrderLocationsSchema, "Update an order location"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderLocationsSchema,
            "Updated order location"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order location not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchOrderLocationsSchema),
                createErrorSchema(IdUUIDParamsSchema),
            ],
            "Validation error(s)"
        ),
    },
});

export const remove = createRoute({
    path: "/order-locations/{id}",
    method: "delete",
    tags,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectOrderLocationsSchema,
            "Deleted order location"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Order location not found"
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