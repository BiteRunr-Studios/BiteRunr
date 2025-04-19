import db from "@/db/index";
import { friendRequests } from "@/db/schema/friendRequests";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
    GetSentFriendRequestsRoute,
    AcceptFriendRequestRoute,
} from "./friendRequests.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectFriendRequestsSchema } from "@/db/schema/friendRequests";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq, and } from "drizzle-orm";
import { friends } from "@/db/schema/friends";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const friendRequests = await db.query.friendRequests.findMany();

    return c.json(friendRequests);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newFriendRequest = c.req.valid("json");
    const [inserted] = await db
        .insert(friendRequests)
        .values(newFriendRequest)
        .returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const friendRequest = await db.query.friendRequests.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!friendRequest) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(friendRequest, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedFriendRequest] = await db
        .update(friendRequests)
        .set(updates)
        .where(eq(friendRequests.id, id))
        .returning();

    if (!updatedFriendRequest) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedFriendRequest, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { receiver_id, sender_id } = c.req.valid("query");
    const [deletedFriendRequest] = await db
        .delete(friendRequests)
        .where(
            and(
                eq(friendRequests.receiver_id, receiver_id),
                eq(friendRequests.sender_id, sender_id)
            )
        )
        .returning();

    if (!deletedFriendRequest) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedFriendRequest, HttpStatusCodes.OK);
};

export const getSentFriendRequests: AppRouteHandler<GetSentFriendRequestsRoute> = async (c) => {
    const { userId, status } = c.req.valid("query");

    // Get all sent friend requests
    const requests = await db.query.friendRequests.findMany({
        where(fields, operators) {
            const conditions = [operators.eq(fields.sender_id, userId)];
            if (status) {
                conditions.push(operators.eq(fields.status, status));
            }
            return operators.and(...conditions);
        },
        with: {
            receiver: true,
        },
    });

    // Fetch Clerk image URLs for all receivers
    const requestsWithImages = await Promise.all(requests.map(async (request) => {
        const receiver = request.receiver;
        
        try {
            const response = await fetch(`https://api.clerk.com/v1/users/${receiver.clerk_id}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const clerkUser = await response.json();
                return {
                    id: request.id,
                    created_at: request.created_at.toISOString(),
                    updated_at: request.updated_at.toISOString(),
                    sender_id: request.sender_id,
                    receiver_id: request.receiver_id,
                    status: request.status,
                    receiver: {
                        id: receiver.id,
                        clerk_id: receiver.clerk_id,
                        first_name: receiver.first_name,
                        last_name: receiver.last_name,
                        image_url: clerkUser.image_url || null,
                    },
                };
            }
        } catch (error) {
            console.error(`Error fetching Clerk user ${receiver.clerk_id}:`, error);
        }
        
        return {
            id: request.id,
            created_at: request.created_at.toISOString(),
            updated_at: request.updated_at.toISOString(),
            sender_id: request.sender_id,
            receiver_id: request.receiver_id,
            status: request.status,
            receiver: {
                id: receiver.id,
                clerk_id: receiver.clerk_id,
                first_name: receiver.first_name,
                last_name: receiver.last_name,
                image_url: null,
            },
        };
    }));

    return c.json(requestsWithImages, HttpStatusCodes.OK);
};

export const acceptFriendRequest: AppRouteHandler<AcceptFriendRequestRoute> = async (c) => {
    const { friend_request_id } = c.req.valid("json");

    // Start a transaction
    const result = await db.transaction(async (tx) => {
        // Get the friend request
        const friendRequest = await tx.query.friendRequests.findFirst({
            where(fields, operators) {
                return operators.eq(fields.id, friend_request_id);
            },
        });

        if (!friendRequest) {
            return null;
        }

        // Update the friend request status to accepted
        await tx
            .update(friendRequests)
            .set({ status: "accepted" })
            .where(eq(friendRequests.id, friend_request_id));

        // Create the friendship
        const [friendship] = await tx
            .insert(friends)
            .values({
                user_id: friendRequest.sender_id,
                friend_id: friendRequest.receiver_id,
            })
            .returning();

        return friendship;
    });

    if (!result) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(result, HttpStatusCodes.OK);
};
