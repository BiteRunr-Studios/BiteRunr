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

import { calculatePlatformFee } from "./fees";

const STRIPE_INSTANT_PAYOUT_PERCENT = 0.01;
const STRIPE_INSTANT_PAYOUT_MIN_FEE_CENTS = 60;
const STRIPE_STANDARD_PAYOUT_PERCENT = 0.0025;
const STRIPE_STANDARD_PAYOUT_FIXED_FEE_CENTS = 25;
const MIN_NET_PAYOUT_CENTS = 500;

function calculateStandardPayoutFee(amountCents: number): number {
  if (amountCents <= 0) return 0;
  return (
    Math.ceil(amountCents * STRIPE_STANDARD_PAYOUT_PERCENT) +
    STRIPE_STANDARD_PAYOUT_FIXED_FEE_CENTS
  );
}

function calculateInstantPayoutFee(amountCents: number): number {
  if (amountCents <= 0) return 0;
  return Math.max(
    Math.ceil(amountCents * STRIPE_INSTANT_PAYOUT_PERCENT),
    STRIPE_INSTANT_PAYOUT_MIN_FEE_CENTS,
  );
}

function calculateMaxInstantPayout(amountAvailableCents: number): {
  amount: number;
  fee: number;
} {
  if (amountAvailableCents <= STRIPE_INSTANT_PAYOUT_MIN_FEE_CENTS) {
    return { amount: 0, fee: 0 };
  }

  // Below the threshold where 1% exceeds the minimum fee, the net payout is
  // simply the available balance minus the fixed minimum fee.
  const minFeeCandidate =
    amountAvailableCents - STRIPE_INSTANT_PAYOUT_MIN_FEE_CENTS;
  if (
    calculateInstantPayoutFee(minFeeCandidate) ===
    STRIPE_INSTANT_PAYOUT_MIN_FEE_CENTS
  ) {
    return minFeeCandidate >= MIN_NET_PAYOUT_CENTS
      ? {
          amount: minFeeCandidate,
          fee: STRIPE_INSTANT_PAYOUT_MIN_FEE_CENTS,
        }
      : { amount: 0, fee: STRIPE_INSTANT_PAYOUT_MIN_FEE_CENTS };
  }

  // Once percentage pricing applies, solve `amount + fee <= available`.
  let amount = Math.floor((amountAvailableCents * 100) / 101);
  while (amount > 0) {
    const fee = calculateInstantPayoutFee(amount);
    if (amount + fee <= amountAvailableCents) {
      return amount >= MIN_NET_PAYOUT_CENTS
        ? { amount, fee }
        : { amount: 0, fee };
    }
    amount -= 1;
  }

  return { amount: 0, fee: 0 };
}

function calculateMaxStandardPayout(amountAvailableCents: number): {
  amount: number;
  fee: number;
} {
  if (amountAvailableCents <= STRIPE_STANDARD_PAYOUT_FIXED_FEE_CENTS) {
    return { amount: 0, fee: 0 };
  }

  let amount = Math.floor(
    (amountAvailableCents - STRIPE_STANDARD_PAYOUT_FIXED_FEE_CENTS) /
      (1 + STRIPE_STANDARD_PAYOUT_PERCENT),
  );
  while (amount > 0) {
    const fee = calculateStandardPayoutFee(amount);
    if (amount + fee <= amountAvailableCents) {
      return amount >= MIN_NET_PAYOUT_CENTS
        ? { amount, fee }
        : { amount: 0, fee };
    }
    amount -= 1;
  }

  return { amount: 0, fee: 0 };
}

async function ensureManualPayoutSchedule(
  stripe: Stripe,
  stripeAccountId: string,
): Promise<void> {
  await stripe.accounts.update(stripeAccountId, {
    settings: {
      payouts: {
        schedule: {
          interval: "manual",
        },
      },
    },
  });
}

async function collectPayoutFee(
  stripe: Stripe,
  stripeAccountId: string,
  amountCents: number,
  currency: string,
  method: "instant" | "standard",
): Promise<Stripe.Charge | null> {
  if (amountCents <= 0) return null;

  return await stripe.charges.create({
    amount: amountCents,
    currency,
    source: stripeAccountId,
    description: `BiteRunr ${method} payout fee`,
    metadata: {
      stripeAccountId,
      payoutMethod: method,
    },
  });
}

async function refundCollectedPayoutFee(
  stripe: Stripe,
  feeCharge: Stripe.Charge | null,
): Promise<void> {
  if (!feeCharge) return;
  try {
    await stripe.refunds.create({ charge: feeCharge.id });
  } catch {
    // If refunding the fee collection fails, preserve the original payout error.
  }
}

async function getPayoutDestinationAvailability(
  stripe: Stripe,
  stripeAccountId: string,
): Promise<{
  hasInstantPayoutCard: boolean;
  hasBankPayoutAccount: boolean;
}> {
  const externalAccounts = await stripe.accounts.listExternalAccounts(
    stripeAccountId,
    { limit: 10 },
  );

  const hasInstantPayoutCard = externalAccounts.data.some(
    (externalAccount) =>
      externalAccount.object === "card" &&
      externalAccount.available_payout_methods?.includes("instant") === true,
  );
  const hasBankPayoutAccount = externalAccounts.data.some(
    (externalAccount) => externalAccount.object === "bank_account",
  );

  return {
    hasInstantPayoutCard,
    hasBankPayoutAccount,
  };
}

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
        country: "CA",
        business_type: "individual",
        business_profile: {
          url: "https://biterunr.com",
          mcc: "5734",
          product_description: "Food delivery services",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            debit_negative_balances: true,
            schedule: {
              interval: "manual",
            },
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

    await ensureManualPayoutSchedule(getStripe(), stripeAccountId);

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
    await ensureManualPayoutSchedule(getStripe(), account.stripeAccountId);
    const onboardingComplete: boolean =
      stripeAccount.details_submitted ?? false;
    const payoutsEnabled: boolean = stripeAccount.payouts_enabled ?? false;
    const chargesEnabled: boolean = stripeAccount.charges_enabled ?? false;

    await ctx.runMutation(internal.payments.updateConnectedAccountByStripeId, {
      stripeAccountId: account.stripeAccountId,
      onboardingComplete,
      payoutsEnabled,
      chargesEnabled,
    });

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
    const amountOwed: number = Number(data.amountOwed);
    const platformFee = calculatePlatformFee(amountOwed);
    const amount = amountOwed + platformFee;

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

      await ctx.runMutation(internal.payments.updateUserStripeCustomerId, {
        userId: user._id,
        stripeCustomerId: customerId,
      });
    }

    // Create an Ephemeral Key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-11-20.acacia" as string },
    );

    // Create a PaymentIntent with Connect transfer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "cad",
      customer: customerId,
      payment_method_types: ["card", "link"],
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

    if (!paymentIntent.client_secret || !ephemeralKey.secret) {
      throw new Error("Stripe did not return payment setup secrets");
    }

    return {
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKeySecret: ephemeralKey.secret,
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
    instantPayoutAmount: number;
    instantPayoutFee: number;
    standardPayoutAmount: number;
    standardPayoutFee: number;
    hasInstantPayoutCard: boolean;
    hasBankPayoutAccount: boolean;
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
    const payoutDestinations = await getPayoutDestinationAvailability(
      stripe,
      account.stripeAccountId,
    );

    const balance = await stripe.balance.retrieve({
      stripeAccount: account.stripeAccountId,
    });

    // Find CAD balances (or first available currency)
    const availableEntry =
      balance.available.find((b) => b.currency === "cad") ??
      balance.available[0];
    const pendingEntry =
      balance.pending.find((b) => b.currency === "cad") ?? balance.pending[0];
    const instantEntry =
      balance.instant_available?.find((b) => b.currency === "cad") ??
      balance.instant_available?.[0];

    const availableAmount = availableEntry?.amount ?? 0;
    // Stripe instant payouts are based on `instant_available`, which can
    // exceed the standard available balance while funds are still queued
    // for the regular payout schedule.
    const instantAmount = instantEntry?.amount ?? 0;
    const { amount: instantPayoutAmount, fee: instantPayoutFee } =
      calculateMaxInstantPayout(instantAmount);
    const { amount: standardPayoutAmount, fee: standardPayoutFee } =
      calculateMaxStandardPayout(availableAmount);
    const hasInstantCapability =
      Array.isArray(balance.instant_available) &&
      balance.instant_available.length > 0;

    return {
      available: availableAmount,
      pending: pendingEntry?.amount ?? 0,
      instantAvailable: instantAmount,
      instantPayoutAmount,
      instantPayoutFee,
      standardPayoutAmount,
      standardPayoutFee,
      hasInstantPayoutCard: payoutDestinations.hasInstantPayoutCard,
      hasBankPayoutAccount: payoutDestinations.hasBankPayoutAccount,
      instantPayoutsEnabled:
        hasInstantCapability &&
        payoutDestinations.hasInstantPayoutCard &&
        instantPayoutAmount > 0,
      currency:
        availableEntry?.currency ??
        instantEntry?.currency ??
        pendingEntry?.currency ??
        "cad",
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
    const payoutDestinations = await getPayoutDestinationAvailability(
      stripe,
      account.stripeAccountId,
    );

    if (!payoutDestinations.hasInstantPayoutCard) {
      throw new Error(
        "Instant payouts are not available for your account. Add a debit card in Stripe to use instant payout.",
      );
    }

    // Get balance to determine payout amount.
    // instant_available is the actual amount Stripe will let you instant-pay.
    const balance = await stripe.balance.retrieve({
      stripeAccount: account.stripeAccountId,
    });

    const instantEntry =
      balance.instant_available?.find((b) => b.currency === "cad") ??
      balance.instant_available?.[0];
    const instantAvailableAmount = instantEntry?.amount ?? 0;

    if (!instantEntry || instantAvailableAmount <= 0) {
      // Check if there are pending funds to give a better message
      const pendingEntry =
        balance.pending.find((b) => b.currency === "cad") ?? balance.pending[0];
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
    const { amount, fee } = calculateMaxInstantPayout(instantAvailableAmount);

    if (amount <= 0) {
      throw new Error(
        `Your instant payout balance of $${(instantAvailableAmount / 100).toFixed(2)} is too small after Stripe fees. Keep collecting payments until you have at least $${(MIN_NET_PAYOUT_CENTS / 100).toFixed(2)} available to transfer.`,
      );
    }

    let feeCharge: Stripe.Charge | null = null;

    try {
      feeCharge = await collectPayoutFee(
        stripe,
        account.stripeAccountId,
        fee,
        currency,
        "instant",
      );
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
        fee,
        currency,
      };
    } catch (error) {
      await refundCollectedPayoutFee(stripe, feeCharge);
      // Provide user-friendly messages for common Stripe errors
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("insufficient funds") || msg.includes("balance")) {
        throw new Error(
          "Insufficient funds for instant payout. Your balance may have changed — please try again.",
        );
      }
      if (msg.includes("instant payouts") || msg.includes("not supported")) {
        throw new Error(
          "Instant payouts are not available for your account. You need a debit card (not a bank account) linked as your payout destination in Stripe.",
        );
      }
      throw new Error(`Payout failed: ${msg}`);
    }
  },
});

// --- STANDARD PAYOUT ---
// Creates a standard payout to the runner's bank account (1-2 business days).

export const requestStandardPayout = action({
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
    const payoutDestinations = await getPayoutDestinationAvailability(
      stripe,
      account.stripeAccountId,
    );

    if (!payoutDestinations.hasBankPayoutAccount) {
      throw new Error(
        "Bank transfers are not available for your account. Add a bank account in Stripe to use standard payouts.",
      );
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: account.stripeAccountId,
    });

    const availableEntry =
      balance.available.find((b) => b.currency === "cad") ??
      balance.available[0];
    const availableAmount = availableEntry?.amount ?? 0;

    if (availableAmount <= 0) {
      const pendingEntry =
        balance.pending.find((b) => b.currency === "cad") ?? balance.pending[0];
      const pendingAmount = pendingEntry?.amount ?? 0;

      if (pendingAmount > 0) {
        throw new Error(
          `No funds available for payout yet. You have $${(pendingAmount / 100).toFixed(2)} pending — these typically become available in 1-2 business days.`,
        );
      }
      throw new Error("No funds available for payout.");
    }

    const currency = availableEntry?.currency ?? "cad";
    const { amount, fee } = calculateMaxStandardPayout(availableAmount);

    if (amount <= 0) {
      throw new Error(
        `Your available balance of $${(availableAmount / 100).toFixed(2)} is too small for a bank payout after Stripe fees. Keep collecting payments until you have at least $${(MIN_NET_PAYOUT_CENTS / 100).toFixed(2)} available to transfer.`,
      );
    }

    let feeCharge: Stripe.Charge | null = null;

    try {
      feeCharge = await collectPayoutFee(
        stripe,
        account.stripeAccountId,
        fee,
        currency,
        "standard",
      );
      const payout = await stripe.payouts.create(
        {
          amount,
          currency,
          method: "standard",
        },
        {
          stripeAccount: account.stripeAccountId,
        },
      );

      return {
        success: true,
        amount: payout.amount,
        fee,
        currency,
      };
    } catch (error) {
      await refundCollectedPayoutFee(stripe, feeCharge);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("insufficient funds") || msg.includes("balance")) {
        throw new Error(
          "Insufficient funds for payout. Your balance may have changed — please try again.",
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
