import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
    insertLocationsSchema,
    patchLocationsSchema,
    selectLocationsSchema,
} from "@/db/schema/locations";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";
import { authMiddleware } from "@/middlewares/clerk-auth";

const tags = ["Locations"];

export const list = createRoute({
    path: "/locations",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectLocationsSchema),
            "List of locations"
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
    path: "/locations",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(insertLocationsSchema, "Create a location"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectLocationsSchema,
            "Create a location"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertLocationsSchema),
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
    path: "/locations/{id}",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectLocationsSchema,
            "Location by Id"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Location not found"
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
    path: "/locations/{id}",
    method: "patch",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
        body: jsonContentRequired(patchLocationsSchema, "Update a Location"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectLocationsSchema,
            "Update a Location"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Location not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchLocationsSchema),
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
    path: "/locations/{id}",
    method: "delete",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectLocationsSchema,
            "Deleted location"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Location not found"
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
