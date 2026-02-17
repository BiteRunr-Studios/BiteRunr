"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";

// Lazy-initialize Stripe (env vars aren't available at module load time in Convex)
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    return new Stripe(key, {
        apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
    });
}

// Platform fee: 10%. Change as needed.
const APPLICATION_FEE_PERCENT = 0.1;

// --- SELLER ONBOARDING ---
// Creates a Stripe Connect Express account and returns the onboarding URL.
// The runner opens this URL to enter their identity + debit card / bank info.

export const createConnectAccount = action({
    args: {},
    handler: async (ctx): Promise<{ url: string; stripeAccountId: string }> => {
        // Get current user via public query (preserves auth context)
        const user = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) throw new Error("Not authenticated");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing: any = await ctx.runQuery(
            internal.payments.getConnectedAccountInternal,
            { userId: user._id },
        );

        let stripeAccountId: string;

        if (existing?.stripeAccountId) {
            stripeAccountId = existing.stripeAccountId;
        } else {
            const account = await getStripe().accounts.create({
                type: "express",
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                settings: {
                    payouts: {
                        debit_negative_balances: true,
                    },
                },
            });
            stripeAccountId = account.id;

            await ctx.runMutation(internal.payments.upsertConnectedAccount, {
                userId: user._id,
                stripeAccountId,
                onboardingComplete: false,
                payoutsEnabled: false,
                chargesEnabled: false,
                email: user.email,
            });
        }

        const siteUrl = process.env.CONVEX_SITE_URL;
        if (!siteUrl) throw new Error("CONVEX_SITE_URL not configured");

        const accountLink = await getStripe().accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${siteUrl}/stripe-onboarding-refresh`,
            return_url: `${siteUrl}/stripe-onboarding-complete`,
            type: "account_onboarding",
        });

        return { url: accountLink.url, stripeAccountId };
    },
});

// --- CHECK ONBOARDING STATUS ---
// Call after runner returns from Stripe onboarding to verify completion.

export const checkOnboardingStatus = action({
    args: {},
    handler: async (ctx): Promise<{
        onboarded: boolean;
        payoutsEnabled: boolean;
        chargesEnabled: boolean;
    }> => {
        const user = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) throw new Error("Not authenticated");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const account: any = await ctx.runQuery(
            internal.payments.getConnectedAccountInternal,
            { userId: user._id },
        );

        if (!account) {
            return {
                onboarded: false,
                payoutsEnabled: false,
                chargesEnabled: false,
            };
        }

        const stripeAccount = await getStripe().accounts.retrieve(
            account.stripeAccountId,
        );
        const onboardingComplete: boolean =
            stripeAccount.details_submitted ?? false;
        const payoutsEnabled: boolean =
            stripeAccount.payouts_enabled ?? false;
        const chargesEnabled: boolean =
            stripeAccount.charges_enabled ?? false;

        await ctx.runMutation(
            internal.payments.updateConnectedAccountByStripeId,
            {
                stripeAccountId: account.stripeAccountId,
                onboardingComplete,
                payoutsEnabled,
                chargesEnabled,
            },
        );

        return {
            onboarded: onboardingComplete,
            payoutsEnabled,
            chargesEnabled,
        };
    },
});

// --- SETTLEMENT CHECKOUT ---
// Member pays what they owe the runner via Stripe Checkout.

export const createSettlementCheckout = action({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args): Promise<{
        sessionId: string;
        url: string | null;
    }> => {
        const user = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) throw new Error("Not authenticated");

        // Expire any previous pending checkout sessions so the user can retry
        await ctx.runMutation(internal.payments.expirePendingPayments, {
            orderId: args.orderId,
            buyerId: user._id,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await ctx.runQuery(
            internal.payments.getSettlementCheckoutData,
            {
                orderId: args.orderId,
                buyerId: user._id,
            },
        );

        if (!data) {
            throw new Error(
                "Cannot create payment: you may not be part of this order, " +
                    "already paid, or the runner hasn't set up card payments",
            );
        }

        const amount: number = Number(data.amountOwed);
        const platformFee = Math.round(amount * APPLICATION_FEE_PERCENT);

        const siteUrl = process.env.CONVEX_SITE_URL;
        if (!siteUrl) throw new Error("CONVEX_SITE_URL not configured");

        const session: Stripe.Checkout.Session = await getStripe().checkout.sessions.create({
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "cad",
                        unit_amount: amount,
                        product_data: {
                            name: `Settlement for ${data.orderName}`,
                        },
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: platformFee,
                transfer_data: {
                    destination: data.stripeAccountId,
                },
            },
            success_url: `${siteUrl}/stripe-payment-success?orderId=${args.orderId}`,
            cancel_url: `${siteUrl}/stripe-payment-cancel?orderId=${args.orderId}`,
        });

        await ctx.runMutation(internal.payments.createStripePaymentRecord, {
            buyerId: user._id,
            sellerId: data.creatorId,
            orderId: args.orderId,
            orderUserId: data.orderUserId,
            stripeSessionId: session.id,
            amount,
            platformFee,
            currency: "cad",
            description: `Settlement for ${data.orderName}`,
        });

        // Mark settlement as claimed while payment is in progress
        await ctx.runMutation(internal.payments.markSettlementClaimed, {
            orderUserId: data.orderUserId,
        });

        return { sessionId: session.id, url: session.url };
    },
});

// --- RUNNER DASHBOARD LINK ---
// Opens Stripe Express Dashboard so runners can view earnings/payouts.

export const createDashboardLink = action({
    args: {},
    handler: async (ctx): Promise<{ url: string }> => {
        const user = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) throw new Error("Not authenticated");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const account: any = await ctx.runQuery(
            internal.payments.getConnectedAccountInternal,
            { userId: user._id },
        );
        if (!account) throw new Error("No connected account found");

        const loginLink: Stripe.LoginLink =
            await getStripe().accounts.createLoginLink(
                account.stripeAccountId,
            );
        return { url: loginLink.url };
    },
});
