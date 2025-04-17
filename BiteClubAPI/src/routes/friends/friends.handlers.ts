import db from "@/db/index";
import { friends } from "@/db/schema/friends";
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
import { eq, or } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const friends = await db.query.friends.findMany();

    return c.json(friends);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newFriend = c.req.valid("json");
    const [inserted] = await db.insert(friends).values(newFriend).returning();

    return c.json(inserted, HttpStatusCodes.OK);
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
    
    const [deletedFriend] = await db
        .delete(friends)
        .where(
            or(
                eq(friends.user_id, friend_id),
                eq(friends.friend_id, friend_id)
            )
        )
        .returning();

    if (!deletedFriend) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedFriend, HttpStatusCodes.OK);
};
