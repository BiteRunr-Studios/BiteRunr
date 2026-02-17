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

// Platform fee: 1%. Change as needed.
const APPLICATION_FEE_PERCENT = 0.01;

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
    handler: async (
        ctx,
    ): Promise<{
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
        const payoutsEnabled: boolean = stripeAccount.payouts_enabled ?? false;
        const chargesEnabled: boolean = stripeAccount.charges_enabled ?? false;

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

// --- PAYMENT SHEET PARAMS ---
// Creates a PaymentIntent + EphemeralKey for the native Payment Sheet.

export const createPaymentSheetParams = action({
    args: { orderId: v.id("orders") },
    handler: async (
        ctx,
        args,
    ): Promise<{
        paymentIntentClientSecret: string;
        ephemeralKeySecret: string;
        customerId: string;
        stripeAccountId: string;
    }> => {
        const user = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) throw new Error("Not authenticated");

        // Expire any previous pending payments so the user can retry
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

        const stripe = getStripe();
        const amount: number = Number(data.amountOwed);
        const platformFee = Math.round(amount * APPLICATION_FEE_PERCENT);

        // Get or create a Stripe Customer for the buyer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userDoc: any = await ctx.runQuery(
            internal.payments.getUserStripeCustomerId,
            { userId: user._id },
        );
        let customerId: string | undefined = userDoc?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { convexUserId: user._id },
            });
            customerId = customer.id;

            await ctx.runMutation(
                internal.payments.updateUserStripeCustomerId,
                {
                    userId: user._id,
                    stripeCustomerId: customerId,
                },
            );
        }

        // Create an Ephemeral Key for the customer
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: "2024-11-20.acacia" as string },
        );

        // Create a PaymentIntent with Connect transfer
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: "cad",
            customer: customerId,
            application_fee_amount: platformFee,
            transfer_data: {
                destination: data.stripeAccountId,
            },
            metadata: {
                orderId: args.orderId,
                buyerId: user._id,
                orderUserId: data.orderUserId,
            },
        });

        // Create a payment record
        await ctx.runMutation(internal.payments.createStripePaymentRecord, {
            buyerId: user._id,
            sellerId: data.creatorId,
            orderId: args.orderId,
            orderUserId: data.orderUserId,
            stripePaymentIntentId: paymentIntent.id,
            amount,
            platformFee,
            currency: "cad",
            description: `Settlement for ${data.orderName}`,
        });

        // Mark settlement as claimed while payment is in progress
        await ctx.runMutation(internal.payments.markSettlementClaimed, {
            orderUserId: data.orderUserId,
        });

        return {
            paymentIntentClientSecret: paymentIntent.client_secret!,
            ephemeralKeySecret: ephemeralKey.secret!,
            customerId,
            stripeAccountId: data.stripeAccountId,
        };
    },
});

// --- PAYOUT BALANCE ---
// Returns the runner's available balance and instant payout eligibility.

export const getPayoutBalance = action({
    args: {},
    handler: async (
        ctx,
    ): Promise<{
        available: number;
        pending: number;
        instantAvailable: number;
        instantPayoutsEnabled: boolean;
        currency: string;
    }> => {
        const user = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) throw new Error("Not authenticated");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const account: any = await ctx.runQuery(
            internal.payments.getConnectedAccountInternal,
            { userId: user._id },
        );
        if (!account) throw new Error("No connected account found");

        const stripe = getStripe();

        const balance = await stripe.balance.retrieve({
            stripeAccount: account.stripeAccountId,
        });

        // Find CAD balances (or first available currency)
        const availableEntry =
            balance.available.find((b) => b.currency === "cad") ??
            balance.available[0];
        const pendingEntry =
            balance.pending.find((b) => b.currency === "cad") ??
            balance.pending[0];
        const instantEntry =
            balance.instant_available?.find((b) => b.currency === "cad") ??
            balance.instant_available?.[0];

        // instant_available is supposed to be a subset of available, but
        // Stripe can sometimes report instant_available > 0 while available
        // is 0 (race / pending settlement). Cap it so the UI stays sane.
        const availableAmount = availableEntry?.amount ?? 0;
        const rawInstant = instantEntry?.amount ?? 0;
        const instantAmount = Math.min(rawInstant, availableAmount);
        const hasInstantCapability =
            Array.isArray(balance.instant_available) &&
            balance.instant_available.length > 0;

        return {
            available: availableAmount,
            pending: pendingEntry?.amount ?? 0,
            instantAvailable: instantAmount,
            instantPayoutsEnabled: hasInstantCapability && instantAmount > 0,
            currency: availableEntry?.currency ?? "cad",
        };
    },
});

// --- INSTANT PAYOUT ---
// Creates an instant payout to the runner's debit card.

export const requestInstantPayout = action({
    args: {},
    handler: async (
        ctx,
    ): Promise<{
        success: boolean;
        amount: number;
        fee: number;
        currency: string;
    }> => {
        const user = await ctx.runQuery(api.users.getCurrentUser, {});
        if (!user) throw new Error("Not authenticated");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const account: any = await ctx.runQuery(
            internal.payments.getConnectedAccountInternal,
            { userId: user._id },
        );
        if (!account) throw new Error("No connected account found");

        const stripe = getStripe();

        // Get balance to determine payout amount.
        // instant_available is the actual amount Stripe will let you instant-pay.
        const balance = await stripe.balance.retrieve({
            stripeAccount: account.stripeAccountId,
        });

        const instantEntry =
            balance.instant_available?.find((b) => b.currency === "cad") ??
            balance.instant_available?.[0];
        const amount = instantEntry?.amount ?? 0;

        if (!instantEntry || amount <= 0) {
            // Check if there are pending funds to give a better message
            const pendingEntry =
                balance.pending.find((b) => b.currency === "cad") ??
                balance.pending[0];
            const pendingAmount = pendingEntry?.amount ?? 0;

            if (pendingAmount > 0) {
                throw new Error(
                    `No funds available for instant payout yet. You have $${(pendingAmount / 100).toFixed(2)} pending — these typically become available in 1-2 business days.`,
                );
            }
            throw new Error(
                "No funds available for instant payout. Make sure you have a debit card linked in your Stripe account.",
            );
        }

        const currency = instantEntry.currency ?? "cad";

        try {
            const payout = await stripe.payouts.create(
                {
                    amount,
                    currency,
                    method: "instant",
                },
                {
                    stripeAccount: account.stripeAccountId,
                },
            );

            return {
                success: true,
                amount: payout.amount,
                fee: 0, // Stripe reports fees separately via balance transactions
                currency,
            };
        } catch (error) {
            // Provide user-friendly messages for common Stripe errors
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes("insufficient funds") || msg.includes("balance")) {
                throw new Error(
                    "Insufficient funds for instant payout. Your balance may have changed — please try again.",
                );
            }
            if (
                msg.includes("instant payouts") ||
                msg.includes("not supported")
            ) {
                throw new Error(
                    "Instant payouts are not available for your account. You need a debit card (not a bank account) linked as your payout destination in Stripe.",
                );
            }
            throw new Error(`Payout failed: ${msg}`);
        }
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
            await getStripe().accounts.createLoginLink(account.stripeAccountId);
        return { url: loginLink.url };
    },
});
