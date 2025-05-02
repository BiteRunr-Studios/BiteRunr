import { createRoute } from "@hono/zod-openapi";
import {
  jsonContent,
  jsonContentOneOf,
  jsonContentRequired,
} from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import {
  baseUserSchema,
  insertUserSchema,
  patchUserSchema,
  selectUserSchema,
} from "@/db/schema/users";

import {
  insertAuthUserSchema,
  patchAuthUserSchema,
  resetUserAuthPasswordSchema,
  selectAuthUserSchema,
  sessionSchema,
  insertAuthUserSSOSchema,
} from "@/db/schema/authUsers";
import { createErrorSchema, IdUUIDParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "@/lib/constants";
import { type Session } from "@supabase/supabase-js";
import { authMiddleware } from "@/middlewares/clerk-auth";

const tags = ["Users"];

export const list = createRoute({
  path: "/users",
  method: "get",
  tags,
  security: [{ Bearer: [] }],
  middleware: [authMiddleware] as const,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(
        selectAuthUserSchema.extend({
          profile: baseUserSchema.required(),
        })
      ),
      "List of users"
    ),
  },
});

export const create = createRoute({
  path: "/users",
  method: "post",
  tags,
  // security: [{ Bearer: [] }],
  // middleware: [authMiddleware] as const,
  request: {
    body: jsonContentRequired(insertAuthUserSchema, "Create a user"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(sessionSchema, "User created"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(selectAuthUserSchema),
      "Error occured while creating user"
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertAuthUserSchema),
      "Validation error(s)"
    ),
  },
});

export const getOne = createRoute({
  path: "/users/{id}",
  method: "get",
  tags,
  security: [{ Bearer: [] }],
  middleware: [authMiddleware] as const,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAuthUserSchema, "User by Id"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "User not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid Id error"
    ),
  },
});

export const patch = createRoute({
  path: "/users/{id}",
  method: "patch",
  tags,
  security: [{ Bearer: [] }],
  middleware: [authMiddleware] as const,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(patchAuthUserSchema, "Update a user"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAuthUserSchema, "Update a user"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "User not found"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(patchAuthUserSchema),
      "Error occured while updating user email"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createErrorSchema(patchAuthUserSchema),
      "User currently unauthorized to update email"
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
      [
        createErrorSchema(patchAuthUserSchema),
        createErrorSchema(IdUUIDParamsSchema),
      ],
      "Validation error(s)"
    ),
  },
});

export const remove = createRoute({
  path: "/users/{id}",
  method: "delete",
  tags,
  security: [{ Bearer: [] }],
  middleware: [authMiddleware] as const,
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectUserSchema, "Deleted user"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "User not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid Id error"
    ),
  },
});

export const resetPassword = createRoute({
  path: "reset-password/user/{id}",
  method: "patch",
  tags,
  security: [{ Bearer: [] }],
  middleware: [authMiddleware] as const,
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(resetUserAuthPasswordSchema, "Reset password"),
  },
  responses: {
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "User not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
      [
        createErrorSchema(resetUserAuthPasswordSchema),
        createErrorSchema(IdUUIDParamsSchema),
      ],
      "Validation error(s)"
    ),
    [HttpStatusCodes.OK]: jsonContent(
      selectAuthUserSchema,
      "User password reset"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createErrorSchema(resetUserAuthPasswordSchema),
      "User currently unauthorized to reset password"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(resetUserAuthPasswordSchema),
      "Error occured while creating user"
    ),
  },
});

export const createFromSSO = createRoute({
  path: "users/sso",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      insertAuthUserSSOSchema,
      "Create SSO user profile"
    ),
  },
  responses: {
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
      [
        createErrorSchema(insertAuthUserSSOSchema),
        createErrorSchema(IdUUIDParamsSchema),
      ],
      "Validation error(s)"
    ),
    [HttpStatusCodes.OK]: jsonContent(selectAuthUserSchema, "User created"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Auth user not found"),
  },
});

// export const patchClerkId = createRoute({
//     path: "/users/clerk/{clerk_id}",
//     method: "patch",
//     tags,
//     security: [{ Bearer: [] }],
//     middleware: [authMiddleware] as const,
//     request: {
//         params: z.object({
//             clerk_id: z.string(),
//         }),
//         body: jsonContentRequired(patchUserSchema, "Update a user"),
//     },
//     responses: {
//         [HttpStatusCodes.OK]: jsonContent(selectUserSchema, "Update a user"),
//         [HttpStatusCodes.NOT_FOUND]: jsonContent(
//             notFoundSchema,
//             "User not found"
//         ),
//         [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContentOneOf(
//             [
//                 createErrorSchema(patchUserSchema),
//                 createErrorSchema(IdUUIDParamsSchema),
//             ],
//             "Validation error(s)"
//         ),
//     },
// });

export const getFriends = createRoute({
    path: "/users/:user_id/friends",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            user_id: z.string(),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectUserSchema),
            "List of user's friends"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "User not found"
        ),
    },
});

// export const getClerkUser = createRoute({
//     path: "/users/clerk/{clerk_id}",
//     method: "get",
//     tags,
//     security: [{ Bearer: [] }],
//     middleware: [authMiddleware] as const,
//     request: {
//         params: z.object({
//             clerk_id: z.string(),
//         }),
//     },
//     responses: {
//         [HttpStatusCodes.OK]: jsonContent(
//             z.object({
//                 image_url: z.string().nullable(),
//             }),
//             "User's Clerk image URL"
//         ),
//         [HttpStatusCodes.NOT_FOUND]: jsonContent(
//             notFoundSchema,
//             "User not found"
//         ),
//     },
// });

export const getFriendRequests = createRoute({
    path: "/users/:user_id/friend-requests",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            user_id: z.string(),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectUserSchema),
            "List of users who have sent friend requests"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "User not found"
        ),
    },
});

// export const getOneByClerkId = createRoute({
//     path: "/users/clerk/{clerk_id}",
//     method: "get",
//     tags,
//     security: [{ Bearer: [] }],
//     middleware: [authMiddleware] as const,
//     request: {
//         params: z.object({
//             clerk_id: z.string(),
//         }),
//     },
//     responses: {
//         [HttpStatusCodes.OK]: jsonContent(
//             selectUserSchema.extend({
//                 image_url: z.string().nullable(),
//             }),
//             "User by Clerk Id"
//         ),
//         [HttpStatusCodes.NOT_FOUND]: jsonContent(
//             notFoundSchema,
//             "User not found"
//         ),
//         [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
//             createErrorSchema(z.object({
//                 clerk_id: z.string(),
//             })),
//             "Invalid Clerk Id error"
//         ),
//     },
// });

export const getAllUsersExceptAuthenticated = createRoute({
    path: "/users/all-except/{user_id}",
    method: "get",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        params: z.object({
            user_id: z.string(),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectUserSchema),
            "List of all users except the specified user"
        ),
    },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type ResetPasswordRoute = typeof resetPassword;
export type SSOCreateRoute = typeof createFromSSO;
// export type PatchClerkIdRoute = typeof patchClerkId;
export type GetFriendsRoute = typeof getFriends;
export type GetFriendRequestsRoute = typeof getFriendRequests;
// export type GetOneByClerkIdRoute = typeof getOneByClerkId;
export type GetAllUsersExceptAuthenticatedRoute = typeof getAllUsersExceptAuthenticated;
