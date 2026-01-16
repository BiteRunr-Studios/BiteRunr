/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as ResendPasswordReset from "../ResendPasswordReset.js";
import type * as auth from "../auth.js";
import type * as emailHelpers from "../emailHelpers.js";
import type * as friends from "../friends.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as locations from "../locations.js";
import type * as orderItems from "../orderItems.js";
import type * as orderLocations from "../orderLocations.js";
import type * as orderUsers from "../orderUsers.js";
import type * as orders from "../orders.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  ResendPasswordReset: typeof ResendPasswordReset;
  auth: typeof auth;
  emailHelpers: typeof emailHelpers;
  friends: typeof friends;
  http: typeof http;
  items: typeof items;
  locations: typeof locations;
  orderItems: typeof orderItems;
  orderLocations: typeof orderLocations;
  orderUsers: typeof orderUsers;
  orders: typeof orders;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
