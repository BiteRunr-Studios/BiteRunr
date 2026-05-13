import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { splitName } from "./lib/utils";

/**
 * Get the current authenticated user's ID from the app's users table.
 * If the user doesn't exist in the app's table yet (e.g., OAuth user on first login),
 * this will return null. Use ensureUser in mutations to create the user if needed.
 */
export async function getUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  // Get the Better Auth user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const betterAuthUser = await authComponent.safeGetAuthUser(ctx as any);
  if (!betterAuthUser) return null;

  // Find the corresponding app user by email
  const appUser = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", betterAuthUser.email))
    .unique();

  return appUser?._id ?? null;
}

/**
 * Ensure the authenticated user exists in the app's users table.
 * Creates the user if they don't exist (e.g., first OAuth login).
 * Returns the user's ID.
 */
export async function ensureUser(
  ctx: MutationCtx,
): Promise<Id<"users"> | null> {
  // Get the Better Auth user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const betterAuthUser = await authComponent.safeGetAuthUser(ctx as any);
  if (!betterAuthUser) return null;

  // Check if app user already exists
  const existingUser = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", betterAuthUser.email))
    .unique();

  if (existingUser) {
    return existingUser._id;
  }

  // Create the app user from Better Auth user data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUser = betterAuthUser as any;

  // Extract firstName and lastName
  let firstName = authUser.firstName;
  let lastName = authUser.lastName;

  if ((!firstName || !lastName) && authUser.name) {
    const names = splitName(authUser.name);
    firstName = firstName || names.firstName || "User";
    lastName = lastName || names.lastName || "";
  }

  const userId = await ctx.db.insert("users", {
    email: betterAuthUser.email,
    firstName: firstName || "User",
    lastName: lastName || "",
    avatarUrl: authUser.image ?? undefined,
  });

  console.log(`Created app user for Better Auth user: ${betterAuthUser.email}`);
  return userId;
}

/**
 * Require authentication and return the user ID.
 * For queries, throws if the user doesn't exist in the app's users table.
 * For mutations, use requireUserIdWithSync instead to auto-create the user.
 */
export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated or user not found");
  }
  return userId;
}

/**
 * Require authentication and return the user ID, creating the user if needed.
 * Use this in mutations where the user might not exist yet (e.g., first OAuth login).
 */
export async function requireUserIdWithSync(
  ctx: MutationCtx,
): Promise<Id<"users">> {
  const userId = await ensureUser(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}
