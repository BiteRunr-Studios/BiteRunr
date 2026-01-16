import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Get the current authenticated user's profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user;
  },
});

// Find a user by email
export const findByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    return user;
  },
});

// Create or update user profile (used after OAuth or signup)
export const upsertProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingUser = await ctx.db.get(userId);

    if (existingUser) {
      // Update existing user - only include avatarUrl if explicitly provided
      const updates: Record<string, string> = {
        firstName: args.firstName,
        lastName: args.lastName,
      };
      if (args.avatarUrl !== undefined) {
        updates.avatarUrl = args.avatarUrl;
      }
      await ctx.db.patch(userId, updates);
      return userId;
    }

    // This shouldn't happen as auth creates the user, but handle it gracefully
    throw new Error("User not found");
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const updates: Record<string, string | undefined> = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    await ctx.db.patch(userId, updates);
    return userId;
  },
});

// Generate an upload URL for avatar images
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Update user avatar from uploaded file
export const updateAvatar = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the new avatar URL is valid before deleting the old one
    const avatarUrl = await ctx.storage.getUrl(args.storageId);
    if (!avatarUrl) throw new Error("Failed to get avatar URL");

    // Get current user to check for existing avatar
    const user = await ctx.db.get(userId);
    if (user?.avatarStorageId) {
      // Delete the old avatar file from storage
      await ctx.storage.delete(user.avatarStorageId);
    }

    // Update the user's avatar URL and storage ID
    await ctx.db.patch(userId, {
      avatarUrl,
      avatarStorageId: args.storageId,
    });

    return { avatarUrl };
  },
});

// Remove user avatar
export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user to retrieve storage ID
    const user = await ctx.db.get(userId);
    if (user?.avatarStorageId) {
      // Delete the avatar file from storage
      await ctx.storage.delete(user.avatarStorageId);
    }

    // Clear both the URL and storage ID references
    await ctx.db.patch(userId, {
      avatarUrl: undefined,
      avatarStorageId: undefined,
    });

    return { success: true };
  },
});
