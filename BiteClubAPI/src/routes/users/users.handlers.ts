import db from "@/db/index";
import {
  users,
  friends,
  friendRequests,
  selectAuthUserSchema,
  authUsers,
} from "@/db/schema/index";
import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  // PatchClerkIdRoute,
  // PatchRoute,
  // RemoveRoute,
  // GetFriendsRoute,
  // GetFriendRequestsRoute,
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
  const [inserted] = await db.insert(users).values(user).returning();

  const response = {
    id: inserted.id,
    email: data.user!.email!,
    profile: {
      first_name: inserted.first_name,
      last_name: inserted.last_name,
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
    },
  };

  return c.json(response, HttpStatusCodes.OK);
};

// export const patch: AppRouteHandler<PatchRoute> = async (c) => {
//     const { id } = c.req.valid("param");
//     const updates = c.req.valid("json");

//     const [updatedUser] = await db
//         .update(users)
//         .set(updates)
//         .where(eq(users.id, id))
//         .returning();

//     if (!updatedUser) {
//         return c.json(
//             {
//                 message: HttpStatusPhrases.NOT_FOUND,
//             },
//             HttpStatusCodes.NOT_FOUND
//         );
//     }

//     return c.json(updatedUser, HttpStatusCodes.OK);
// };

// export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
//     const { id } = c.req.valid("param");
//     const [deletedUser] = await db
//         .delete(users)
//         .where(eq(users.id, id))
//         .returning();

//     if (!deletedUser) {
//         return c.json(
//             {
//                 message: HttpStatusPhrases.NOT_FOUND,
//             },
//             HttpStatusCodes.NOT_FOUND
//         );
//     }

//     return c.json(deletedUser, HttpStatusCodes.OK);
// };

// export const patchClerkId: AppRouteHandler<PatchClerkIdRoute> = async (c) => {
//     const { clerk_id } = c.req.valid("param");
//     const updates = c.req.valid("json");

//     const [updatedUser] = await db
//         .update(users)
//         .set(updates)
//         .where(eq(users.clerk_id, clerk_id))
//         .returning();

//     if (!updatedUser) {
//         return c.json(
//             {
//                 message: HttpStatusPhrases.NOT_FOUND,
//             },
//             HttpStatusCodes.NOT_FOUND
//         );
//     }

//     return c.json(updatedUser, HttpStatusCodes.OK);
// };

// export const getFriends: AppRouteHandler<GetFriendsRoute> = async (c) => {
//     const { clerk_id } = c.req.valid("param");
//     console.log("Looking for user with clerk_id:", clerk_id);

//     // First find the user by clerk_id
//     const user = await db.query.users.findFirst({
//         where(fields, operators) {
//             return operators.eq(fields.clerk_id, clerk_id);
//         },
//     });

//     console.log("Found user:", user);

//     if (!user) {
//         console.log(
//             "User not found in database. Available users:",
//             await db.query.users.findMany({
//                 columns: {
//                     id: true,
//                     clerk_id: true,
//                     first_name: true,
//                     last_name: true,
//                 },
//             })
//         );
//         return c.json(
//             {
//                 message: HttpStatusPhrases.NOT_FOUND,
//                 details: `No user found with clerk_id: ${clerk_id}`,
//             },
//             HttpStatusCodes.NOT_FOUND
//         );
//     }

//     // Get all friends where the user is either the user_id or friend_id
//     const userFriends = await db.query.friends.findMany({
//         where(fields, operators) {
//             return operators.or(
//                 operators.eq(fields.user_id, user.id),
//                 operators.eq(fields.friend_id, user.id)
//             );
//         },
//         with: {
//             user: true,
//             friend: true,
//         },
//     });

//     console.log("Found friendships:", JSON.stringify(userFriends, null, 2));

//     // Map the friends to get the actual friend user objects and fetch their image_urls
//     const friendsList = await Promise.all(
//         userFriends.map(async (friendship) => {
//             const friend =
//                 friendship.user_id === user.id
//                     ? friendship.friend
//                     : friendship.user;

//             try {
//                 const response = await fetch(
//                     `https://api.clerk.com/v1/users/${friend.clerk_id}`,
//                     {
//                         headers: {
//                             Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
//                             "Content-Type": "application/json",
//                         },
//                     }
//                 );

//                 if (response.ok) {
//                     const clerkUser = await response.json();
//                     return {
//                         ...friend,
//                         image_url: clerkUser.image_url || null,
//                     };
//                 }
//             } catch (error) {
//                 console.error(
//                     `Error fetching Clerk user ${friend.clerk_id}:`,
//                     error
//                 );
//             }

//             return {
//                 ...friend,
//                 image_url: null,
//             };
//         })
//     );

//     console.log("Final friends list:", JSON.stringify(friendsList, null, 2));

//     return c.json(friendsList, HttpStatusCodes.OK);
// };

// export const getFriendRequests: AppRouteHandler<
//     GetFriendRequestsRoute
// > = async (c) => {
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

//     const requests = await db.query.friendRequests.findMany({
//         where(fields, operators) {
//             return operators.and(
//                 operators.eq(fields.receiver_id, user.id),
//                 operators.eq(fields.status, "pending")
//             );
//         },
//         with: {
//             sender: true,
//         },
//     });

//     const requesters = await Promise.all(
//         requests.map(async (request) => {
//             const sender = request.sender;

//             try {
//                 const response = await fetch(
//                     `https://api.clerk.com/v1/users/${sender.clerk_id}`,
//                     {
//                         headers: {
//                             Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
//                             "Content-Type": "application/json",
//                         },
//                     }
//                 );

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

// export const getAllUsersExceptAuthenticated: AppRouteHandler<GetAllUsersExceptAuthenticatedRoute> = async (c) => {
//     const { clerkId } = c.req.valid("param");

//     // Get all users except the specified user
//     const otherUsers = await db.query.users.findMany({
//         where(fields, operators) {
//             return operators.not(eq(fields.clerk_id, clerkId));
//         },
//     });

//     // Fetch Clerk image URLs for all users
//     const usersWithImages = await Promise.all(otherUsers.map(async (user) => {
//         try {
//             const response = await fetch(`https://api.clerk.com/v1/users/${user.clerk_id}`, {
//                 headers: {
//                     'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
//                     'Content-Type': 'application/json',
//                 },
//             });

//             if (response.ok) {
//                 const clerkUser = await response.json();
//                 return {
//                     ...user,
//                     image_url: clerkUser.image_url || null,
//                 };
//             }
//         } catch (error) {
//             console.error(`Error fetching Clerk user ${user.clerk_id}:`, error);
//         }

//         return {
//             ...user,
//             image_url: null,
//         };
//     }));

//     return c.json(usersWithImages, HttpStatusCodes.OK);
// };
