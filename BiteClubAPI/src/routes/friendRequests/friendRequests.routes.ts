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
import { authMiddleware } from "@/middlewares/clerk-auth";

const tags = ["Friend Requests"];

export const list = createRoute({
    path: "/friend-requests",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
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
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
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
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
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
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
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
    path: "/friend-requests",
    method: "delete",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        query: z.object({
            receiver_id: z.string().uuid(),
            sender_id: z.string().uuid(),
        }),
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
            createErrorSchema(z.object({
                receiver_id: z.string().uuid(),
                sender_id: z.string().uuid(),
            })),
            "Invalid IDs error"
        ),
    },
});

export const getSentFriendRequests = createRoute({
    path: "/sent-friend-requests",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        query: z.object({
            userId: z.string().uuid(),
            status: z.enum(["pending", "accepted", "rejected"]).optional(),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(z.object({
                id: z.string().uuid(),
                created_at: z.string(),
                updated_at: z.string(),
                sender_id: z.string().uuid(),
                receiver_id: z.string().uuid(),
                status: z.enum(["pending", "accepted", "rejected"]),
                receiver: z.object({
                    id: z.string().uuid(),
                    clerk_id: z.string(),
                    first_name: z.string(),
                    last_name: z.string(),
                    image_url: z.string().nullable(),
                }),
            })),
            "List of sent friend requests"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "User not found"
        ),
    },
});

export const acceptFriendRequest = createRoute({
    path: "/friend-requests/accept",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(
            z.object({
                friend_request_id: z.string().uuid(),
            }),
            "Accept a friend request"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.object({
                id: z.string().uuid(),
                user_id: z.string().uuid(),
                friend_id: z.string().uuid(),
                created_at: z.string(),
                updated_at: z.string(),
            }),
            "Accepted friend request and created friendship"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Friend request not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(z.object({
                friend_request_id: z.string().uuid(),
            })),
            "Invalid friend request ID"
        ),
    },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetSentFriendRequestsRoute = typeof getSentFriendRequests;
export type AcceptFriendRequestRoute = typeof acceptFriendRequest;
