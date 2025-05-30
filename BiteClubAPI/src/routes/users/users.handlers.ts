import db from "@/db/index";
import {
    users,
    selectAuthUserSchema,
    authUsers,
    sessionSchema,
} from "@/db/schema/index";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
    ResetPasswordRoute,
    SSOCreateRoute,
    GetFriendsRoute,
    GetFriendRequestsRoute,
    GetAllUsersExceptAuthenticatedRoute,
    UserHasActiveOrders,
} from "./users.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";
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

    if (!authUser || !authUser.profile) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(authUser, HttpStatusCodes.OK);
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

    const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, profile.id));

    if (existingUser) {
        const response = {
            ...existingAuthUser,
            profile: existingUser,
        };
        return c.json(response, HttpStatusCodes.ACCEPTED);
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
  
    const user = await db.query.users.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, user_id);
      },
    });
  
    if (!user) {
      return c.json(
        {
          message: HttpStatusPhrases.NOT_FOUND,
          details: `No user found with id: ${user_id}`,
        },
        HttpStatusCodes.NOT_FOUND
      );
    }
  
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
  
    const friendsList = userFriends.map((friendship) =>
      friendship.user_id === user.id ? friendship.friend : friendship.user
    );
  
    const friendIds = friendsList.map((friend) => friend.id);
  
    const authUsersWithEmails = await db.query.authUsers.findMany({
      where(fields, operators) {
        return operators.inArray(fields.id, friendIds);
      },
      columns: {
        id: true,
        email: true,
      },
    });
  
    const emailMap = new Map(
      authUsersWithEmails.map((authUser) => [authUser.id, authUser.email])
    );
  
    // Merge email into friend profiles
    const friendsWithEmails = friendsList.map((friend) => ({
      ...friend,
      email: emailMap.get(friend.id) || null,
    }));
  
    return c.json(friendsWithEmails, HttpStatusCodes.OK);
  };
  

  export const getFriendRequests: AppRouteHandler<GetFriendRequestsRoute> = async (
    c
  ) => {
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
  
    const senderIds = requests.map((request) => request.sender_id);
  
    const authUsersWithEmails = await db.query.authUsers.findMany({
      where(fields, operators) {
        return operators.inArray(fields.id, senderIds);
      },
      columns: {
        id: true,
        email: true,
      },
    });
  
    const emailMap = new Map(
      authUsersWithEmails.map((authUser) => [authUser.id, authUser.email])
    );
  
    const requesters = requests.map((request) => {
      const sender = request.sender;
      return {
        ...sender,
        email: emailMap.get(sender.id) || null,
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
      };
    });
  
    return c.json(requesters, HttpStatusCodes.OK);
  };
  

export const isUserInActiveOrder: AppRouteHandler<UserHasActiveOrders> = async (
    c
) => {
    const { id } = c.req.valid("param");

    const user = await db.query.users.findFirst({
        with: {
            orderUsers: {
                with: {
                    order: true,
                },
            },
        },
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

    const isMemberOfActiveOrder = user.orderUsers.some(
        (orderUser) => orderUser.order && orderUser.order.status === "active"
    );

    const isCreatorOfActiveOrder = await db.query.orders.findFirst({
        where(fields, operators) {
            return operators.and(
                operators.eq(fields.creator_id, id),
                operators.eq(fields.status, "active")
            );
        },
    });

    const hasActiveOrder =
        isMemberOfActiveOrder == true || isCreatorOfActiveOrder != null;

    return c.json(hasActiveOrder, HttpStatusCodes.OK);
};

export const getAllUsersExceptAuthenticated: AppRouteHandler<
  GetAllUsersExceptAuthenticatedRoute
> = async (c) => {
  const { user_id } = c.req.valid("param");

  const otherUsers = await db.query.users.findMany({
    where(fields, operators) {
      return operators.not(eq(fields.id, user_id));
    },
  });

  const userIds = otherUsers.map((user) => user.id);

  const authUsersWithEmails = await db.query.authUsers.findMany({
    where(fields, operators) {
      return operators.inArray(fields.id, userIds);
    },
    columns: {
      id: true,
      email: true,
    },
  });

  const emailMap = new Map(
    authUsersWithEmails.map((authUser) => [authUser.id, authUser.email])
  );

  const usersWithEmails = otherUsers.map((user) => ({
    ...user,
    email: emailMap.get(user.id) || null,
  }));

  return c.json(usersWithEmails, HttpStatusCodes.OK);
};

