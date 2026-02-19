import { v } from "convex/values";
import {
    query,
    mutation,
    internalMutation,
    internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getUserId } from "./authHelper";
import { stripePaymentStatusValidator } from "./schema";

// ---- CONNECTED ACCOUNTS ----

// Public: get the current user's connected account
export const getMyConnectedAccount = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const account = await ctx.db
            .query("connectedAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!account) return null;

        return {
            stripeAccountId: account.stripeAccountId,
            onboardingComplete: account.onboardingComplete,
            payoutsEnabled: account.payoutsEnabled,
            chargesEnabled: account.chargesEnabled,
        };
    },
});

// Public: check if the runner (order creator) accepts card payments
export const getRunnerStripeStatus = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        const account = await ctx.db
            .query("connectedAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", order.creatorId))
            .first();

        return {
            acceptsCards: !!account?.chargesEnabled,
        };
    },
});

// Internal: get connected account by userId
export const getConnectedAccountInternal = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("connectedAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
    },
});

// Internal: upsert connected account
export const upsertConnectedAccount = internalMutation({
    args: {
        userId: v.id("users"),
        stripeAccountId: v.string(),
        onboardingComplete: v.boolean(),
        payoutsEnabled: v.boolean(),
        chargesEnabled: v.boolean(),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("connectedAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, { ...args, updatedAt: now });
            return existing._id;
        } else {
            return await ctx.db.insert("connectedAccounts", {
                ...args,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

// Internal: update connected account by Stripe account ID (for webhooks)
export const updateConnectedAccountByStripeId = internalMutation({
    args: {
        stripeAccountId: v.string(),
        onboardingComplete: v.boolean(),
        payoutsEnabled: v.boolean(),
        chargesEnabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("connectedAccounts")
            .withIndex("by_stripeAccountId", (q) =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .first();
        if (account) {
            await ctx.db.patch(account._id, {
                onboardingComplete: args.onboardingComplete,
                payoutsEnabled: args.payoutsEnabled,
                chargesEnabled: args.chargesEnabled,
                updatedAt: Date.now(),
            });
        }
    },
});

// Internal: look up the runner userId by their Stripe connected account ID (for webhook notifications)
export const getRunnerByStripeAccountId = internalQuery({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const account = await ctx.db
            .query("connectedAccounts")
            .withIndex("by_stripeAccountId", (q) =>
                q.eq("stripeAccountId", args.stripeAccountId),
            )
            .first();
        if (!account) return null;
        return { userId: account.userId };
    },
});

// ---- STRIPE PAYMENTS ----

// Internal: get everything needed for a settlement checkout
export const getSettlementCheckoutData = internalQuery({
    args: { orderId: v.id("orders"), buyerId: v.id("users") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        // Buyer can't be the creator
        if (order.creatorId === args.buyerId) return null;

        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        const buyerOrderUser = orderUsers.find(
            (ou) => ou.userId === args.buyerId,
        );
        if (!buyerOrderUser) return null;
        if (buyerOrderUser.amountOwed <= 0n) return null;
        if (
            buyerOrderUser.settlementStatus === "confirmed" ||
            buyerOrderUser.settlementStatus === "settled_in_person"
        )
            return null;

        // Check for existing active Stripe payment
        const existingPayments = await ctx.db
            .query("stripePayments")
            .withIndex("by_orderUserId", (q) =>
                q.eq("orderUserId", buyerOrderUser._id),
            )
            .collect();
        const hasActivePayment = existingPayments.some(
            (p) => p.status === "pending",
        );
        if (hasActivePayment) return null;

        const sellerAccount = await ctx.db
            .query("connectedAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", order.creatorId))
            .first();

        if (!sellerAccount || !sellerAccount.chargesEnabled) return null;

        return {
            orderName: order.name,
            creatorId: order.creatorId,
            orderUserId: buyerOrderUser._id,
            amountOwed: buyerOrderUser.amountOwed,
            stripeAccountId: sellerAccount.stripeAccountId,
        };
    },
});

// Internal: mark settlement as claimed (payment in progress)
export const markSettlementClaimed = internalMutation({
    args: { orderUserId: v.id("orderUsers") },
    handler: async (ctx, args) => {
        const orderUser = await ctx.db.get(args.orderUserId);
        if (!orderUser) return;
        if (
            orderUser.settlementStatus !== "unpaid" &&
            orderUser.settlementStatus !== "claimed"
        )
            return;
        await ctx.db.patch(args.orderUserId, {
            settlementStatus: "claimed",
        });
    },
});

// Internal: expire stale pending payments so the user can retry checkout
export const expirePendingPayments = internalMutation({
    args: { orderId: v.id("orders"), buyerId: v.id("users") },
    handler: async (ctx, args) => {
        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();
        const buyerOrderUser = orderUsers.find(
            (ou) => ou.userId === args.buyerId,
        );
        if (!buyerOrderUser) return;

        const payments = await ctx.db
            .query("stripePayments")
            .withIndex("by_orderUserId", (q) =>
                q.eq("orderUserId", buyerOrderUser._id),
            )
            .collect();

        for (const payment of payments) {
            if (payment.status === "pending") {
                await ctx.db.patch(payment._id, {
                    status: "expired",
                    updatedAt: Date.now(),
                });
            }
        }

        // Reset settlement back to unpaid if it was only claimed
        if (buyerOrderUser.settlementStatus === "claimed") {
            await ctx.db.patch(buyerOrderUser._id, {
                settlementStatus: "unpaid",
            });
        }
    },
});

// Internal: get user's stripeCustomerId
export const getUserStripeCustomerId = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;
        return { stripeCustomerId: user.stripeCustomerId };
    },
});

// Internal: update user's stripeCustomerId
export const updateUserStripeCustomerId = internalMutation({
    args: {
        userId: v.id("users"),
        stripeCustomerId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            stripeCustomerId: args.stripeCustomerId,
        });
    },
});

// Internal: create stripe payment record
export const createStripePaymentRecord = internalMutation({
    args: {
        buyerId: v.id("users"),
        sellerId: v.id("users"),
        orderId: v.id("orders"),
        orderUserId: v.id("orderUsers"),
        stripeSessionId: v.optional(v.string()),
        stripePaymentIntentId: v.optional(v.string()),
        amount: v.number(),
        platformFee: v.number(),
        currency: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert("stripePayments", {
            ...args,
            status: "pending",
            createdAt: now,
            updatedAt: now,
        });
    },
});

// Internal: update stripe payment by session ID and sync settlement status
export const updateStripePaymentBySessionId = internalMutation({
    args: {
        stripeSessionId: v.string(),
        status: stripePaymentStatusValidator,
        stripePaymentIntentId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const payment = await ctx.db
            .query("stripePayments")
            .withIndex("by_stripeSessionId", (q) =>
                q.eq("stripeSessionId", args.stripeSessionId),
            )
            .first();
        if (!payment) return;

        await ctx.db.patch(payment._id, {
            status: args.status,
            stripePaymentIntentId: args.stripePaymentIntentId,
            updatedAt: Date.now(),
        });

        // Sync settlement status
        if (args.status === "completed") {
            await ctx.db.patch(payment.orderUserId, {
                settlementStatus: "confirmed",
            });

            // Send push notification
            const orderUser = await ctx.db.get(payment.orderUserId);
            if (orderUser) {
                const order = await ctx.db.get(payment.orderId);
                await ctx.scheduler.runAfter(
                    0,
                    internal.pushNotifications.sendToUser,
                    {
                        userId: orderUser.userId,
                        title: "Payment Confirmed",
                        body: `Your card payment for ${order?.name ?? "the order"} has been confirmed!`,
                        data: {
                            type: "payment_confirmed",
                            orderId: payment.orderId,
                        },
                    },
                );
            }
        } else if (args.status === "failed") {
            // Reset to unpaid so member can try again
            await ctx.db.patch(payment.orderUserId, {
                settlementStatus: "unpaid",
            });
        }
    },
});

// Internal: update stripe payment by PaymentIntent ID and sync settlement status
export const updateStripePaymentByPaymentIntentId = internalMutation({
    args: {
        stripePaymentIntentId: v.string(),
        status: stripePaymentStatusValidator,
    },
    handler: async (ctx, args) => {
        const payment = await ctx.db
            .query("stripePayments")
            .withIndex("by_stripePaymentIntentId", (q) =>
                q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
            )
            .first();
        if (!payment) return;

        await ctx.db.patch(payment._id, {
            status: args.status,
            updatedAt: Date.now(),
        });

        // Sync settlement status
        if (args.status === "completed") {
            await ctx.db.patch(payment.orderUserId, {
                settlementStatus: "confirmed",
            });

            // Send push notification
            const orderUser = await ctx.db.get(payment.orderUserId);
            if (orderUser) {
                const order = await ctx.db.get(payment.orderId);
                await ctx.scheduler.runAfter(
                    0,
                    internal.pushNotifications.sendToUser,
                    {
                        userId: orderUser.userId,
                        title: "Payment Confirmed",
                        body: `Your card payment for ${order?.name ?? "the order"} has been confirmed!`,
                        data: {
                            type: "payment_confirmed",
                            orderId: payment.orderId,
                        },
                    },
                );
            }
        } else if (args.status === "failed") {
            await ctx.db.patch(payment.orderUserId, {
                settlementStatus: "unpaid",
            });
        }
    },
});

// ---- SETTLEMENT ----

// Public: get payment/settlement status for all members of an order (creator only)
export const getOrderPaymentStatus = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const order = await ctx.db.get(args.orderId);
        if (!order || order.creatorId !== userId) return null;

        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        const members = await Promise.all(
            orderUsers.map(async (ou) => {
                const user = await ctx.db.get(ou.userId);

                // Get the latest Stripe payment for this order user
                const payments = await ctx.db
                    .query("stripePayments")
                    .withIndex("by_orderUserId", (q) =>
                        q.eq("orderUserId", ou._id),
                    )
                    .collect();
                const latestPayment =
                    payments.length > 0
                        ? payments.reduce((a, b) =>
                              a._creationTime > b._creationTime ? a : b,
                          )
                        : null;

                return {
                    orderUserId: ou._id,
                    userId: ou.userId,
                    isCreator: ou.userId === order.creatorId,
                    firstName: user?.firstName ?? "Unknown",
                    lastName: user?.lastName ?? "",
                    email: user?.email ?? "",
                    amountOwed: ou.amountOwed,
                    settlementStatus: ou.settlementStatus,
                    stripePayment: latestPayment
                        ? {
                              status: latestPayment.status,
                              amount: latestPayment.amount,
                          }
                        : null,
                };
            }),
        );

        return {
            orderId: args.orderId,
            orderName: order.name,
            members,
        };
    },
});

// Public: get settlement status for the current user (non-creator member)
export const getMySettlementStatus = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        // Must not be the creator
        if (order.creatorId === userId) return null;

        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        const myOrderUser = orderUsers.find((ou) => ou.userId === userId);
        if (!myOrderUser) return null;

        const creator = await ctx.db.get(order.creatorId);

        // Get the latest Stripe payment for this user
        const payments = await ctx.db
            .query("stripePayments")
            .withIndex("by_orderUserId", (q) =>
                q.eq("orderUserId", myOrderUser._id),
            )
            .collect();
        const latestPayment =
            payments.length > 0
                ? payments.reduce((a, b) =>
                      a._creationTime > b._creationTime ? a : b,
                  )
                : null;

        return {
            orderName: order.name,
            creatorFirstName: creator?.firstName ?? "Unknown",
            creatorLastName: creator?.lastName ?? "",
            orderUserId: myOrderUser._id,
            amountOwed: myOrderUser.amountOwed,
            settlementStatus: myOrderUser.settlementStatus,
            stripePayment: latestPayment
                ? {
                      status: latestPayment.status,
                      amount: latestPayment.amount,
                  }
                : null,
        };
    },
});

// Public: mark a member as settled in person (creator or the member themselves)
export const markSettledInPerson = mutation({
    args: {
        orderId: v.id("orders"),
        orderUserId: v.id("orderUsers"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        const orderUser = await ctx.db.get(args.orderUserId);
        if (!orderUser || orderUser.orderId !== args.orderId) {
            throw new Error("Member not found in this order");
        }

        // Allow creator OR the member themselves
        const isCreator = order.creatorId === userId;
        const isSelf = orderUser.userId === userId;
        if (!isCreator && !isSelf) {
            throw new Error("Not authorized to mark this settlement");
        }

        if (orderUser.amountOwed <= 0n) {
            throw new Error("Member does not owe any money");
        }

        if (
            orderUser.settlementStatus === "confirmed" ||
            orderUser.settlementStatus === "settled_in_person"
        ) {
            throw new Error("Member is already settled");
        }

        await ctx.db.patch(args.orderUserId, {
            settlementStatus: "settled_in_person",
        });
    },
});

// Public: get stripe payment for a specific order user (for status display)
export const getStripePaymentForOrderUser = query({
    args: { orderUserId: v.id("orderUsers") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const orderUser = await ctx.db.get(args.orderUserId);
        if (!orderUser || orderUser.userId !== userId) return null;

        const payments = await ctx.db
            .query("stripePayments")
            .withIndex("by_orderUserId", (q) =>
                q.eq("orderUserId", args.orderUserId),
            )
            .collect();

        // Return the most recent payment
        if (payments.length === 0) return null;
        const latest = payments.reduce((a, b) =>
            a._creationTime > b._creationTime ? a : b,
        );

        return {
            status: latest.status,
            amount: latest.amount,
            currency: latest.currency,
        };
    },
});
