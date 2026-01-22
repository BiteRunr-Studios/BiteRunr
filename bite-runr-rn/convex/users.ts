import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getUserId } from "./authHelper";

// Get the current authenticated user's profile
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const user = await ctx.db.get(userId);
        if (!user) return null;

        return {
            _id: user._id,
            _creationTime: user._creationTime,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            avatarStorageId: user.avatarStorageId,
        };
    },
});

// Update user profile
export const updateProfile = mutation({
    args: {
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const updates: Record<string, string> = {};
        if (args.firstName !== undefined) updates.firstName = args.firstName;
        if (args.lastName !== undefined) updates.lastName = args.lastName;

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(userId, updates);
        }

        return userId;
    },
});

// Generate an upload URL for avatar images
export const generateAvatarUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);
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
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        // Verify the new avatar URL is valid
        const avatarUrl = await ctx.storage.getUrl(args.storageId);
        if (!avatarUrl) throw new Error("Failed to get avatar URL");

        // Delete old avatar if exists
        if (user.avatarStorageId) {
            try {
                await ctx.storage.delete(user.avatarStorageId);
            } catch {
                // Ignore errors if file doesn't exist
            }
        }

        // Update the user's avatar
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
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        // Delete avatar file if exists
        if (user.avatarStorageId) {
            try {
                await ctx.storage.delete(user.avatarStorageId);
            } catch {
                // Ignore errors if file doesn't exist
            }
        }

        // Clear avatar references
        await ctx.db.patch(userId, {
            avatarUrl: undefined,
            avatarStorageId: undefined,
        });

        return { success: true };
    },
});
