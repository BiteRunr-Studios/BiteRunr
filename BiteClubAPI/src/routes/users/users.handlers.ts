import db from "@/db/index";
import {
    users,
    friends,
    friendRequests,
    selectAuthUserSchema,
    authUsers,
    patchAuthUserSchema,
    sessionSchema,
} from "@/db/schema/index";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    // PatchClerkIdRoute,
    PatchRoute,
    RemoveRoute,
    ResetPasswordRoute,
    SSOCreateRoute,
    // GetFriendsRoute,
    // GetFriendRequestsRoute,
    // PatchRoute,
    // RemoveRoute,
    GetFriendsRoute,
    GetFriendRequestsRoute,
    GetAllUsersExceptAuthenticatedRoute,
    // GetOneByClerkIdRoute,
    // GetAllUsersExceptAuthenticatedRoute,
} from "./users.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq, getTableColumns } from "drizzle-orm";
import { z } from "zod";
import { profile } from "console";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const users = await db.query.authUsers.findMany({
        with: {
            profile: true,
        },
    });

    return c.json(users);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");

    const user = await db.query.authUsers.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
        with: {
            profile: {
                columns: {
                    id: false,
                },
            },
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

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newUser = c.req.valid("json");

    // supabase auth user insertion
    const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
    });

    if (error || !data.user) return c.json(error, HttpStatusCodes.BAD_REQUEST);

    // user profile insertion
    const user = {
        id: data.user!.id,
        first_name: newUser.profile.first_name,
        last_name: newUser.profile.last_name,
    };

    await db.insert(users).values(user);

    const response = sessionSchema.parse(data.session);

    return c.json(response, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    // 1. Extract tokens (assume sent in request body for this example)
    const { access_token, refresh_token } = updates;

    // 2. Set session if tokens are present
    if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: access_token,
            refresh_token: refresh_token,
        });
        if (sessionError) {
            return c.json(sessionError, HttpStatusCodes.UNAUTHORIZED);
        }
    }

    if (updates.email) {
        // 3. Now update the user
        const { data, error } = await supabase.auth.updateUser({
            email: updates.email,
        });

        if (error || !data.user)
            return c.json(error, HttpStatusCodes.BAD_REQUEST);
    }

    const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
    const [existingAuthUser] = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.id, id));

    if (!existingUser) {
        return c.json(
            { message: HttpStatusPhrases.NOT_FOUND },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const user = {
        first_name:
            updates.profile.first_name !== undefined &&
            updates.profile.first_name !== null &&
            updates.profile.first_name !== ""
                ? updates.profile.first_name
                : existingUser.first_name,
        last_name:
            updates.profile.last_name !== undefined &&
            updates.profile.last_name !== null &&
            updates.profile.last_name !== ""
                ? updates.profile.last_name
                : existingUser.last_name,
    };

    const [updatedUser] = await db
        .update(users)
        .set(user)
        .where(eq(users.id, id))
        .returning();

    if (!updatedUser) {
        return c.json(
            { message: HttpStatusPhrases.NOT_FOUND },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const response = selectAuthUserSchema.parse({
        id: updatedUser.id,
        email: existingAuthUser.email, // If email was updated, use the new value
        profile: {
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            created_at: updatedUser.created_at,
            updated_at: updatedUser.updated_at,
        },
    });

    return c.json(response, HttpStatusCodes.OK);
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

export const resetPassword: AppRouteHandler<ResetPasswordRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const resetPasswordObject = c.req.valid("json");

    const authUser = await db.query.authUsers.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
        with: {
            profile: {
                columns: {
                    id: false,
                },
            },
        },
    });

    if (!authUser) {
        return c.json(
            { message: HttpStatusPhrases.NOT_FOUND },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: resetPasswordObject.old_password,
    });

    if (signInError) {
        return c.json(
            {
                error: {
                    issues: [
                        {
                            code: "invalid_password",
                            path: ["old_password"],
                            message: "Old password is incorrect",
                        },
                    ],
                    name: "ValidationError",
                },
                success: false,
            },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const { data, error } = await supabase.auth.updateUser({
        email: authUser.email,
        password: resetPasswordObject.password,
    });

    if (error || !data.user) return c.json(error, HttpStatusCodes.BAD_REQUEST);

    const response = selectAuthUserSchema.parse(authUser);

    return c.json(response, HttpStatusCodes.OK);
};

export const createSSOUserProfile: AppRouteHandler<SSOCreateRoute> = async (
    c
) => {
    const profile = c.req.valid("json");

    const [existingAuthUser] = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.id, profile.id));

    if (!existingAuthUser) {
        return c.json(
            { message: HttpStatusPhrases.NOT_FOUND },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const [inserted] = await db.insert(users).values(profile).returning();

    const response = {
        ...existingAuthUser,
        profile: inserted,
    };

    return c.json(response, HttpStatusCodes.OK);
};

export const getFriends: AppRouteHandler<GetFriendsRoute> = async (c) => {
    const { user_id } = c.req.valid("param");
    console.log("Looking for user with id:", user_id);

    // Find the user by id (user_id from user_profiles)
    const user = await db.query.users.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, user_id);
        },
    });

    console.log("Found user:", user);

    if (!user) {
        console.log(
            "User not found in database. Available users:",
            await db.query.users.findMany({
                columns: {
                    id: true,
                    first_name: true,
                    last_name: true,
                },
            })
        );
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
                details: `No user found with id: ${user_id}`,
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

    // Map to friends (user objects) without external Clerk API calls
    const friendsList = userFriends.map((friendship) => {
        return friendship.user_id === user.id
            ? friendship.friend
            : friendship.user;
    });

    console.log("Final friends list:", JSON.stringify(friendsList, null, 2));

    return c.json(friendsList, HttpStatusCodes.OK);
};

export const getFriendRequests: AppRouteHandler<
    GetFriendRequestsRoute
> = async (c) => {
    const { user_id } = c.req.valid("param");

    const user = await db.query.users.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, user_id);
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

    const requests = await db.query.friendRequests.findMany({
        where(fields, operators) {
            return operators.and(
                operators.eq(fields.receiver_id, user.id),
                operators.eq(fields.status, "pending")
            );
        },
        with: {
            sender: true,
        },
    });

    const requesters = requests.map((request) => {
        const sender = request.sender;
        return {
            ...sender,
            sender_id: request.sender_id,
            receiver_id: request.receiver_id,
        };
    });

    return c.json(requesters, HttpStatusCodes.OK);
};

// export const getOneByClerkId: AppRouteHandler<GetOneByClerkIdRoute> = async (
//     c
// ) => {
//     const { clerk_id } = c.req.valid("param");

//     const user = await db.query.users.findFirst({
//         where(fields, operators) {
//             return operators.eq(fields.clerk_id, clerk_id);
//         },
//     });

//     if (!user) {
//         return c.json(
//             {
//                 message: HttpStatusPhrases.NOT_FOUND,
//             },
//             HttpStatusCodes.NOT_FOUND
//         );
//     }

//     try {
//         const response = await fetch(
//             `https://api.clerk.com/v1/users/${clerk_id}`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
//                     "Content-Type": "application/json",
//                 },
//             }
//         );

//         if (response.ok) {
//             const clerkUser = await response.json();
//             return c.json(
//                 {
//                     ...user,
//                     image_url: clerkUser.image_url || null,
//                 },
//                 HttpStatusCodes.OK
//             );
//         }
//     } catch (error) {
//         console.error(`Error fetching Clerk user ${clerk_id}:`, error);
//     }

//     return c.json(
//         {
//             ...user,
//             image_url: null,
//         },
//         HttpStatusCodes.OK
//     );
// };
//                 if (response.ok) {
//                     const clerkUser = await response.json();
//                     return {
//                         ...sender,
//                         image_url: clerkUser.image_url || null,
//                         sender_id: request.sender_id,
//                         receiver_id: request.receiver_id,
//                     };
//                 }
//             } catch (error) {
//                 console.error(
//                     `Error fetching Clerk user ${sender.clerk_id}:`,
//                     error
//                 );
//             }

//             return {
//                 ...sender,
//                 image_url: null,
//                 sender_id: request.sender_id,
//                 receiver_id: request.receiver_id,
//             };
//         })
//     );

//     return c.json(requesters, HttpStatusCodes.OK);
// };

export const getAllUsersExceptAuthenticated: AppRouteHandler<
    GetAllUsersExceptAuthenticatedRoute
> = async (c) => {
    const { user_id } = c.req.valid("param");

    // Get all users except the specified user
    const otherUsers = await db.query.users.findMany({
        where(fields, operators) {
            return operators.not(eq(fields.id, user_id));
        },
    });

    return c.json(otherUsers, HttpStatusCodes.OK);
};
