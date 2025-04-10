import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
    insertUserSchema,
    patchUserSchema,
    selectUserSchema,
} from "@/db/schema/user.js";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants.js";

const tags = ["Users"];

export const list = createRoute({
    path: "/users",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectUserSchema),
            "List of users"
        ),
    },
});

export const create = createRoute({
    path: "/users",
    method: "post",
    tags,
    request: {
        body: jsonContentRequired(insertUserSchema, "Create a user"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(selectUserSchema, "Create a user"),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertUserSchema),
            "Validation error(s)"
        ),
    },
});

export const getOne = createRoute({
    path: "/users/{id}",
    method: "get",
    tags,
    request: {
        params: IdParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(selectUserSchema, "User by Id"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "User not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const patch = createRoute({
    path: "/users/{id}",
    method: "patch",
    tags,
    request: {
        params: IdParamsSchema,
        body: jsonContentRequired(patchUserSchema, "Update a user"),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(selectUserSchema, "Update a user"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "User not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchUserSchema),
                createErrorSchema(IdParamsSchema),
            ],
            "Validation error(s)"
        ),
    },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
