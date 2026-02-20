import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { getUserId } from "./authHelper";
import { PushNotifications } from "@convex-dev/expo-push-notifications";

// Initialize the push notifications component
export const pushNotifications = new PushNotifications(components.pushNotifications);

// Check if current user has a push token registered
export const hasToken = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);
        if (!userId) return false;

        const status = await pushNotifications.getStatusForUser(ctx, { userId });
        return status.hasToken;
    },
});

// Register a push token for the current user
// This also removes the token from any previous user on this device
// to prevent duplicate notifications across accounts
export const registerPushToken = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Check if this device token was previously registered to a different user
        const existing = await ctx.db
            .query("devicePushTokens")
            .withIndex("by_pushToken", (q) => q.eq("pushToken", args.token))
            .first();

        if (existing && existing.userId !== userId) {
            // Remove the push token from the previous user in the notifications component
            await pushNotifications.removeToken(ctx, { userId: existing.userId });
            // Update the ownership record to the new user
            await ctx.db.patch(existing._id, { userId });
        } else if (!existing) {
            // First time this token is being registered
            await ctx.db.insert("devicePushTokens", {
                pushToken: args.token,
                userId,
            });
        }

        // Register the token for the current user
        await pushNotifications.recordToken(ctx, {
            userId,
            pushToken: args.token,
        });

        return true;
    },
});

// Unregister push token on logout
export const unregisterPushToken = mutation({
    args: {
        token: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Remove from the notifications component
        await pushNotifications.removeToken(ctx, { userId });

        // Clean up our ownership tracking
        if (args.token) {
            const record = await ctx.db
                .query("devicePushTokens")
                .withIndex("by_pushToken", (q) => q.eq("pushToken", args.token))
                .first();
            if (record && record.userId === userId) {
                await ctx.db.delete(record._id);
            }
        } else {
            // Remove all ownership records for this user
            const records = await ctx.db
                .query("devicePushTokens")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .collect();
            for (const record of records) {
                await ctx.db.delete(record._id);
            }
        }

        return true;
    },
});

// Internal mutation to send a notification to a user
export const sendToUser = internalMutation({
    args: {
        userId: v.id("users"),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await pushNotifications.sendPushNotification(ctx, {
            userId: args.userId,
            notification: {
                title: args.title,
                body: args.body,
                data: args.data ?? {},
            },
            allowUnregisteredTokens: true,
        });
    },
});

// Internal mutation to send notifications to multiple users
export const sendToUsers = internalMutation({
    args: {
        userIds: v.array(v.id("users")),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        for (const userId of args.userIds) {
            await pushNotifications.sendPushNotification(ctx, {
                userId,
                notification: {
                    title: args.title,
                    body: args.body,
                    data: args.data ?? {},
                },
            });
        }
    },
});
