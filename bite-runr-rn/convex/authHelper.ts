import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get the current authenticated user's ID from the Convex auth context
 * This uses the Better Auth token that's passed through the Convex provider
 * Returns null if not authenticated
 */
export async function getUserId(
    ctx: QueryCtx | MutationCtx
): Promise<Id<"users"> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    // The subject contains the Better Auth user ID which maps to our users table
    return identity.subject as Id<"users">;
}

/**
 * Require authentication and return the user ID
 * Throws an error if not authenticated
 */
export async function requireUserId(
    ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
    const userId = await getUserId(ctx);
    if (!userId) {
        throw new Error("Not authenticated");
    }
    return userId;
}
