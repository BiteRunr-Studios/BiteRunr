import db from "@/db/index";
import { users, friends } from "@/db/schema/index";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchClerkIdRoute,
    PatchRoute,
    RemoveRoute,
    GetFriendsRoute,
} from "./users.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const users = await db.query.users.findMany();

    return c.json(users);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newUser = c.req.valid("json");
    const [inserted] = await db.insert(users).values(newUser).returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const user = await db.query.users.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!user) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(user, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

    if (!updatedUser) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedUser, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();

    if (!deletedUser) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedUser, HttpStatusCodes.OK);
};

export const patchClerkId: AppRouteHandler<PatchClerkIdRoute> = async (c) => {
    const { clerk_id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.clerk_id, clerk_id))
        .returning();

    if (!updatedUser) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedUser, HttpStatusCodes.OK);
};

export const getFriends: AppRouteHandler<GetFriendsRoute> = async (c) => {
    const { clerk_id } = c.req.valid("param");
    console.log("Looking for user with clerk_id:", clerk_id);
    
    // First find the user by clerk_id
    const user = await db.query.users.findFirst({
        where(fields, operators) {
            return operators.eq(fields.clerk_id, clerk_id);
        },
    });

    console.log("Found user:", user);

    if (!user) {
        console.log("User not found in database. Available users:", await db.query.users.findMany({
            columns: {
                id: true,
                clerk_id: true,
                first_name: true,
                last_name: true,
            }
        }));
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
                details: `No user found with clerk_id: ${clerk_id}`
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    // Get all friends where the user is either the user_id or friend_id
    const userFriends = await db.query.friends.findMany({
        where(fields, operators) {
            return operators.or(
                operators.eq(fields.user_id, user.id),
                operators.eq(fields.friend_id, user.id)
            );
        },
        with: {
            user: true,
            friend: true,
        },
    });

    console.log("Found friendships:", JSON.stringify(userFriends, null, 2));

    // Map the friends to get the actual friend user objects and fetch their image_urls
    const friendsList = await Promise.all(userFriends.map(async (friendship) => {
        const friend = friendship.user_id === user.id ? friendship.friend : friendship.user;
        
        try {
            const response = await fetch(`https://api.clerk.com/v1/users/${friend.clerk_id}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const clerkUser = await response.json();
                return {
                    ...friend,
                    image_url: clerkUser.image_url || null,
                };
            }
        } catch (error) {
            console.error(`Error fetching Clerk user ${friend.clerk_id}:`, error);
        }
        
        return {
            ...friend,
            image_url: null,
        };
    }));

    console.log("Final friends list:", JSON.stringify(friendsList, null, 2));

    return c.json(friendsList, HttpStatusCodes.OK);
};
