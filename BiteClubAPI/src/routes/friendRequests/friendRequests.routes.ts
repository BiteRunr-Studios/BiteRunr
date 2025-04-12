import { createRoute } from "@hono/zod-openapi";
import {
    jsonContent,
    jsonContentOneOf,
    jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
    insertFriendRequestsSchema,
    patchFriendRequestsSchema,
    selectFriendRequestsSchema,
} from "@/db/schema/friendRequests";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";

const tags = ["Friend Requests"];

export const list = createRoute({
    path: "/friend-requests",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectFriendRequestsSchema),
            "List of friend requests"
        ),
    },
});

export const create = createRoute({
    path: "/friend-requests",
    method: "post",
    tags,
    request: {
        body: jsonContentRequired(
            insertFriendRequestsSchema,
            "Create a friend request"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectFriendRequestsSchema,
            "Create a friend request"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(insertFriendRequestsSchema),
            "Validation error(s)"
        ),
    },
});

export const getOne = createRoute({
    path: "/friend-requests/{id}",
    method: "get",
    tags,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectFriendRequestsSchema,
            "Friend request by Id"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Friend request not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdUUIDParamsSchema),
            "Invalid Id error"
        ),
    },
});

export const patch = createRoute({
    path: "/friend-requests/{id}",
    method: "patch",
    tags,
    request: {
        params: IdUUIDParamsSchema,
        body: jsonContentRequired(
            patchFriendRequestsSchema,
            "Update a friend request"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectFriendRequestsSchema,
            "Update a friend request"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Friend request not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
            [
                createErrorSchema(patchFriendRequestsSchema),
                createErrorSchema(IdUUIDParamsSchema),
            ],
            "Validation error(s)"
        ),
    },
});

export const remove = createRoute({
    path: "/friend-requests/{id}",
    method: "delete",
    tags,
    request: {
        params: IdUUIDParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectFriendRequestsSchema,
            "Deleted friend request"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Friend request not found"
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
