import db from "@/db/index";
import { friends } from "@/db/schema/friends";
import { friendRequests } from "@/db/schema/friendRequests";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./friends.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectFriendsSchema } from "@/db/schema/friends";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq, or, and } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const friends = await db.query.friends.findMany();

    return c.json(friends);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newFriend = c.req.valid("json");

    // Start a transaction
    const result = await db.transaction(async (tx) => {
        // Create the friendship
        const [friendship] = await tx
            .insert(friends)
            .values(newFriend)
            .returning();

        // Update the friend request status to accepted
        await tx
            .update(friendRequests)
            .set({ status: "accepted" })
            .where(
                and(
                    eq(friendRequests.sender_id, newFriend.user_id),
                    eq(friendRequests.receiver_id, newFriend.friend_id)
                )
            );

        return friendship;
    });

    return c.json(result, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const friend = await db.query.friends.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!friend) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(friend, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedFriend] = await db
        .update(friends)
        .set(updates)
        .where(eq(friends.id, id))
        .returning();

    if (!updatedFriend) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedFriend, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { friend_id } = c.req.valid("param");

    // Start a transaction
    const result = await db.transaction(async (tx) => {
        // First get the friendship to find the user IDs
        const friendship = await tx.query.friends.findFirst({
            where(fields, operators) {
                return operators.or(
                    operators.eq(fields.user_id, friend_id),
                    operators.eq(fields.friend_id, friend_id)
                );
            },
        });

        if (!friendship) {
            return null;
        }

        // Delete the friendship
        const [deletedFriend] = await tx
            .delete(friends)
            .where(
                or(
                    eq(friends.user_id, friend_id),
                    eq(friends.friend_id, friend_id)
                )
            )
            .returning();

        // Delete the corresponding friend request
        await tx
            .delete(friendRequests)
            .where(
                or(
                    and(
                        eq(friendRequests.sender_id, friendship.user_id),
                        eq(friendRequests.receiver_id, friendship.friend_id)
                    ),
                    and(
                        eq(friendRequests.sender_id, friendship.friend_id),
                        eq(friendRequests.receiver_id, friendship.user_id)
                    )
                )
            );

        return deletedFriend;
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
