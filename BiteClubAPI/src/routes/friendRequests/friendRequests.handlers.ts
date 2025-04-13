import db from "@/db/index";
import { friendRequests } from "@/db/schema/friendRequests";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./friendRequests.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectFriendRequestsSchema } from "@/db/schema/friendRequests";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

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
    const { id } = c.req.valid("param");
    const [deletedFriendRequest] = await db
        .delete(friendRequests)
        .where(eq(friendRequests.id, id))
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
