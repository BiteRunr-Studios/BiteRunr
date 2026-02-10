import { v } from "convex/values";
import {
    query,
    action,
    internalMutation,
    internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getUserId } from "./authHelper";
import { paymentStatusValidator } from "./schema";

const PLATFORM_FEE_PERCENT = 5;

// ── Queries ──

// Get the current user's Stripe Connect status
export const getConnectStatus = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const user = await ctx.db.get(userId);
        if (!user) return null;

        return {
            hasAccount: !!user.stripeConnectAccountId,
            isOnboarded: user.stripeConnectOnboarded === true,
            accountId: user.stripeConnectAccountId,
        };
    },
});

// Check if the runner (order creator) has Stripe set up for receiving payments
export const getRunnerPaymentCapability = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        const runner = await ctx.db.get(order.creatorId);
        if (!runner) return null;

        return {
            canReceivePayments: runner.stripeConnectOnboarded === true,
            runnerId: runner._id,
        };
    },
});

// Get all payments for an order
export const getPaymentsForOrder = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        // Verify user is part of this order
        const orderUser = await ctx.db
            .query("orderUsers")
            .withIndex("by_userId_orderId", (q) =>
                q.eq("userId", userId).eq("orderId", args.orderId),
            )
            .first();
        if (!orderUser) return null;

        const payments = await ctx.db
            .query("payments")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        return payments.map((p) => ({
            id: p._id,
            orderUserId: p.orderUserId,
            payerUserId: p.payerUserId,
            recipientUserId: p.recipientUserId,
            amountInCents: p.amountInCents,
            status: p.status,
            failureMessage: p.failureMessage,
            createdAt: p._creationTime,
        }));
    },
});

// Get payment history for current user (both sent and received)
export const getPaymentHistory = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        // Get all order users for this user
        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        // Get all payments for all orders the user is part of
        const allPayments = [];
        for (const ou of orderUsers) {
            const payments = await ctx.db
                .query("payments")
                .withIndex("by_orderId", (q) => q.eq("orderId", ou.orderId))
                .collect();
            allPayments.push(...payments);
        }

        // Filter to only payments where user is payer or recipient
        const userPayments = allPayments.filter(
            (p) => p.payerUserId === userId || p.recipientUserId === userId,
        );

        // Enrich with order and user data
        const enriched = await Promise.all(
            userPayments.map(async (p) => {
                const order = await ctx.db.get(p.orderId);
                const payer = await ctx.db.get(p.payerUserId);
                const recipient = await ctx.db.get(p.recipientUserId);
                return {
                    id: p._id,
                    orderId: p.orderId,
                    orderName: order?.name ?? "Unknown",
                    amountInCents: p.amountInCents,
                    status: p.status,
                    isPayer: p.payerUserId === userId,
                    otherUserName:
                        p.payerUserId === userId
                            ? `${recipient?.firstName ?? ""} ${recipient?.lastName ?? ""}`.trim()
                            : `${payer?.firstName ?? ""} ${payer?.lastName ?? ""}`.trim(),
                    createdAt: p._creationTime,
                };
            }),
        );

        return enriched.sort((a, b) => b.createdAt - a.createdAt);
    },
});

// ── Actions (call Stripe API) ──

// Create a Stripe Connect Express account and return the onboarding URL
export const createConnectAccount = action({
    args: {},
    returns: v.object({ url: v.string(), accountId: v.string() }),
    handler: async (ctx): Promise<{ url: string; accountId: string }> => {
        const userId = await ctx.runQuery(
            internal.stripe.getCurrentUserId,
        );
        if (!userId) throw new Error("Not authenticated");

        const userData = await ctx.runQuery(
            internal.stripe.getUserData,
            { userId },
        );
        if (!userData) throw new Error("User not found");

        // If already has an account, create a new onboarding link
        if (userData.stripeConnectAccountId) {
            const stripe = getStripeClient();
            const accountLink = await stripe.accountLinks.create({
                account: userData.stripeConnectAccountId,
                refresh_url: `${process.env.SITE_URL}/stripe-connect-refresh`,
                return_url: `${process.env.SITE_URL}/stripe-connect-return`,
                type: "account_onboarding",
            });
            return { url: accountLink.url as string, accountId: userData.stripeConnectAccountId };
        }

        const stripe = getStripeClient();

        // Create Express account
        const account = await stripe.accounts.create({
            type: "express",
            email: userData.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: "individual",
        });

        // Save the account ID
        await ctx.runMutation(internal.stripe.saveConnectAccountId, {
            userId,
            accountId: account.id as string,
        });

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.SITE_URL}/stripe-connect-refresh`,
            return_url: `${process.env.SITE_URL}/stripe-connect-return`,
            type: "account_onboarding",
        });

        return { url: accountLink.url as string, accountId: account.id as string };
    },
});

// Check Stripe Connect account status (poll after onboarding return)
export const checkConnectAccountStatus = action({
    args: {},
    returns: v.object({ isOnboarded: v.boolean() }),
    handler: async (ctx): Promise<{ isOnboarded: boolean }> => {
        const userId = await ctx.runQuery(
            internal.stripe.getCurrentUserId,
        );
        if (!userId) throw new Error("Not authenticated");

        const userData = await ctx.runQuery(
            internal.stripe.getUserData,
            { userId },
        );
        if (!userData?.stripeConnectAccountId) {
            return { isOnboarded: false };
        }

        const stripe = getStripeClient();
        const account = await stripe.accounts.retrieve(
            userData.stripeConnectAccountId,
        );

        const isOnboarded: boolean =
            account.charges_enabled === true &&
            account.details_submitted === true;

        if (isOnboarded && !userData.stripeConnectOnboarded) {
            await ctx.runMutation(internal.stripe.markOnboarded, { userId });
        }

        return { isOnboarded };
    },
});

// Create a PaymentIntent for a participant to pay the runner
export const createPaymentIntent = action({
    args: { orderUserId: v.id("orderUsers") },
    returns: v.object({
        clientSecret: v.union(v.string(), v.null()),
        paymentIntentId: v.string(),
    }),
    handler: async (
        ctx,
        args,
    ): Promise<{ clientSecret: string | null; paymentIntentId: string }> => {
        const userId = await ctx.runQuery(
            internal.stripe.getCurrentUserId,
        );
        if (!userId) throw new Error("Not authenticated");

        const setupData = await ctx.runQuery(
            internal.stripe.getPaymentSetupData,
            { orderUserId: args.orderUserId, userId },
        );

        if (!setupData) {
            throw new Error("Unable to set up payment");
        }

        const {
            orderId,
            payerUserId,
            recipientUserId,
            stripeConnectAccountId,
            amountInCents,
        } = setupData;

        if (amountInCents <= 0n) {
            throw new Error("No amount owed");
        }

        const amountNumber: number = Number(amountInCents);
        const feeAmount: number = Math.round(
            (amountNumber * PLATFORM_FEE_PERCENT) / 100,
        );

        const stripe = getStripeClient();

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountNumber,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
            application_fee_amount: feeAmount,
            transfer_data: {
                destination: stripeConnectAccountId,
            },
            metadata: {
                orderId,
                orderUserId: args.orderUserId,
                payerUserId,
                recipientUserId,
            },
        });

        // Save payment record
        await ctx.runMutation(internal.stripe.createPaymentRecord, {
            orderId: orderId as any,
            orderUserId: args.orderUserId,
            payerUserId: payerUserId as any,
            recipientUserId: recipientUserId as any,
            stripePaymentIntentId: paymentIntent.id as string,
            stripeConnectAccountId,
            amountInCents: BigInt(amountNumber),
            applicationFeeInCents: BigInt(feeAmount),
            clientSecret: (paymentIntent.client_secret as string) ?? undefined,
        });

        // Update settlement status to processing
        await ctx.runMutation(internal.stripe.updateSettlementStatus, {
            orderUserId: args.orderUserId,
            status: "processing",
        });

        return {
            clientSecret: (paymentIntent.client_secret as string) ?? null,
            paymentIntentId: paymentIntent.id as string,
        };
    },
});

// ── Internal Queries ──

export const getCurrentUserId = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await getUserId(ctx);
    },
});

export const getUserData = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

export const getPaymentSetupData = internalQuery({
    args: { orderUserId: v.id("orderUsers"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const orderUser = await ctx.db.get(args.orderUserId);
        if (!orderUser) return null;

        // Payer must be the requesting user
        if (orderUser.userId !== args.userId) return null;

        const order = await ctx.db.get(orderUser.orderId);
        if (!order) return null;

        // Can't pay yourself
        if (order.creatorId === args.userId) return null;

        // Check for existing non-failed payment
        const existingPayments = await ctx.db
            .query("payments")
            .withIndex("by_orderUserId", (q) =>
                q.eq("orderUserId", args.orderUserId),
            )
            .collect();

        const hasActivePayment = existingPayments.some(
            (p) => p.status === "pending" || p.status === "processing" || p.status === "succeeded",
        );
        if (hasActivePayment) return null;

        // Get runner's Stripe account
        const runner = await ctx.db.get(order.creatorId);
        if (!runner?.stripeConnectAccountId || !runner.stripeConnectOnboarded) {
            return null;
        }

        return {
            orderId: order._id.toString(),
            payerUserId: args.userId.toString(),
            recipientUserId: order.creatorId.toString(),
            stripeConnectAccountId: runner.stripeConnectAccountId,
            amountInCents: orderUser.amountOwed,
        };
    },
});

export const getUserByStripeAccountId = internalQuery({
    args: { accountId: v.string() },
    handler: async (ctx, args) => {
        // Linear scan since we don't have an index on stripeConnectAccountId
        // This is only called from webhooks, which are infrequent
        const users = await ctx.db.query("users").collect();
        return users.find(
            (u) => u.stripeConnectAccountId === args.accountId,
        ) ?? null;
    },
});

export const getPaymentByIntentId = internalQuery({
    args: { paymentIntentId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("payments")
            .withIndex("by_stripePaymentIntentId", (q) =>
                q.eq("stripePaymentIntentId", args.paymentIntentId),
            )
            .first();
    },
});

// ── Internal Mutations ──

export const saveConnectAccountId = internalMutation({
    args: {
        userId: v.id("users"),
        accountId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            stripeConnectAccountId: args.accountId,
        });
    },
});

export const markOnboarded = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            stripeConnectOnboarded: true,
        });
    },
});

export const createPaymentRecord = internalMutation({
    args: {
        orderId: v.id("orders"),
        orderUserId: v.id("orderUsers"),
        payerUserId: v.id("users"),
        recipientUserId: v.id("users"),
        stripePaymentIntentId: v.string(),
        stripeConnectAccountId: v.string(),
        amountInCents: v.int64(),
        applicationFeeInCents: v.int64(),
        clientSecret: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("payments", {
            orderId: args.orderId,
            orderUserId: args.orderUserId,
            payerUserId: args.payerUserId,
            recipientUserId: args.recipientUserId,
            stripePaymentIntentId: args.stripePaymentIntentId,
            stripeConnectAccountId: args.stripeConnectAccountId,
            amountInCents: args.amountInCents,
            applicationFeeInCents: args.applicationFeeInCents,
            status: "pending",
            clientSecret: args.clientSecret,
        });
    },
});

export const updatePaymentStatus = internalMutation({
    args: {
        paymentId: v.id("payments"),
        status: paymentStatusValidator,
        failureMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: Record<string, unknown> = { status: args.status };
        if (args.failureMessage !== undefined) {
            updates.failureMessage = args.failureMessage;
        }
        await ctx.db.patch(args.paymentId, updates);
    },
});

export const updateSettlementStatus = internalMutation({
    args: {
        orderUserId: v.id("orderUsers"),
        status: v.union(
            v.literal("unpaid"),
            v.literal("processing"),
            v.literal("paid"),
            v.literal("failed"),
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.orderUserId, {
            settlementStatus: args.status,
        });
    },
});

// ── Helpers ──

function getStripeClient() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require("stripe");
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-04-30.basil",
    });
}
