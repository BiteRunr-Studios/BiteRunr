import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { components } from "./_generated/api";
import { getUserId } from "./authHelper";
import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { Id } from "./_generated/dataModel";

// Initialize the push notifications component
export const pushNotifications = new PushNotifications(components.pushNotifications);

// Register a push token for the current user
export const registerPushToken = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await pushNotifications.recordToken(ctx, {
            userId,
            pushToken: args.token,
        });

        return true;
    },
});

// Unregister push token on logout (remove token for user)
export const unregisterPushToken = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Remove the push token for this user
        await pushNotifications.removeToken(ctx, { userId });

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
