import { v } from "convex/values";
import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getUserId } from "./authHelper";
import { paymentHandleStatusValidator } from "./schema";

// Get payment status for all members of an order (creator only)
export const getOrderPaymentStatus = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.creatorId !== userId) return null;

    // Get all order users
    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Get all payment handles for this order
    const paymentHandles = await ctx.db
      .query("paymentHandles")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Build a map of orderUserId -> latest payment handle
    const handlesByUser = new Map<string, typeof paymentHandles[0]>();
    for (const handle of paymentHandles) {
      const existing = handlesByUser.get(handle.orderUserId);
      if (!existing || handle._creationTime > existing._creationTime) {
        handlesByUser.set(handle.orderUserId, handle);
      }
    }

    // Enrich with user info
    const members = await Promise.all(
      orderUsers.map(async (ou) => {
        const user = await ctx.db.get(ou.userId);
        const handle = handlesByUser.get(ou._id);

        return {
          orderUserId: ou._id,
          userId: ou.userId,
          isCreator: ou.userId === order.creatorId,
          firstName: user?.firstName ?? "Unknown",
          lastName: user?.lastName ?? "",
          email: user?.email ?? "",
          amountOwed: ou.amountOwed,
          settlementStatus: ou.settlementStatus,
          paymentHandle: handle
            ? {
                id: handle._id,
                status: handle.status,
                errorMessage: handle.errorMessage,
                redirectUrl: handle.redirectUrl,
              }
            : null,
        };
      })
    );

    return {
      orderId: args.orderId,
      orderName: order.name,
      members,
    };
  },
});

// Mark a member as settled in person (creator only)
export const markSettledInPerson = mutation({
  args: {
    orderId: v.id("orders"),
    orderUserId: v.id("orderUsers"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order || order.creatorId !== userId) {
      throw new Error("Only the order creator can mark settlements");
    }

    const orderUser = await ctx.db.get(args.orderUserId);
    if (!orderUser || orderUser.orderId !== args.orderId) {
      throw new Error("Member not found in this order");
    }

    if (orderUser.amountOwed <= 0n) {
      throw new Error("Member does not owe any money");
    }

    if (orderUser.settlementStatus === "confirmed" || orderUser.settlementStatus === "settled_in_person") {
      throw new Error("Member is already settled");
    }

    await ctx.db.patch(args.orderUserId, { settlementStatus: "settled_in_person" });
  },
});

// Request payments for all unpaid members (creator only)
export const requestPayments = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    // Verify auth via getOrderPaymentStatus query (checks creator access internally)
    const status = await ctx.runQuery(api.paysafe.getOrderPaymentStatus, {
      orderId: args.orderId,
    });
    if (!status) throw new Error("Not authorized or order not found");

    const creatorUserId = status.members.find(
      (m: { isCreator: boolean }) => m.isCreator
    )?.userId;
    if (!creatorUserId) throw new Error("Creator not found");

    // Get unpaid members who owe money and don't have active payment handles
    const members = await ctx.runQuery(internal.paysafe.getUnpaidMembers, {
      orderId: args.orderId,
      creatorId: creatorUserId,
    });

    if (members.length === 0) {
      return { requested: 0, message: "No payments to request" };
    }

    // Create payment handles and schedule API calls
    let requested = 0;
    for (const member of members) {
      const merchantRefNum = `order_${args.orderId}_user_${member.orderUserId}_${Date.now()}`;

      // Create the DB record
      const handleId = await ctx.runMutation(internal.paysafe.createPaymentHandle, {
        orderUserId: member.orderUserId,
        orderId: args.orderId,
        merchantRefNum,
        amountInCents: member.amountOwed,
      });

      // Schedule the Paysafe API call
      await ctx.scheduler.runAfter(0, internal.paysafe.callPaysafeCreatePaymentHandle, {
        paymentHandleId: handleId,
        merchantRefNum,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        amountInCents: member.amountOwed,
      });

      requested++;
    }

    return { requested, message: `Payment requests sent to ${requested} member${requested > 1 ? "s" : ""}` };
  },
});

// Internal query: get members who need payment requests
export const getUnpaidMembers = internalQuery({
  args: { orderId: v.id("orders"), creatorId: v.id("users") },
  handler: async (ctx, args) => {
    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const results = [];

    for (const ou of orderUsers) {
      // Skip creator
      if (ou.userId === args.creatorId) continue;
      // Skip zero amounts
      if (ou.amountOwed <= 0n) continue;
      // Skip already confirmed or settled in person
      if (ou.settlementStatus === "confirmed" || ou.settlementStatus === "settled_in_person") continue;

      // Check for active payment handles
      const existingHandles = await ctx.db
        .query("paymentHandles")
        .withIndex("by_orderUserId", (q) => q.eq("orderUserId", ou._id))
        .collect();

      const hasActiveHandle = existingHandles.some(
        (h) => h.status === "pending" || h.status === "initiated" || h.status === "payable" || h.status === "processing"
      );

      if (hasActiveHandle) continue;

      const user = await ctx.db.get(ou.userId);
      if (!user) continue;

      results.push({
        orderUserId: ou._id,
        userId: ou.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        amountOwed: ou.amountOwed,
      });
    }

    return results;
  },
});

// Internal mutation: create payment handle record
export const createPaymentHandle = internalMutation({
  args: {
    orderUserId: v.id("orderUsers"),
    orderId: v.id("orders"),
    merchantRefNum: v.string(),
    amountInCents: v.int64(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("paymentHandles", {
      orderUserId: args.orderUserId,
      orderId: args.orderId,
      merchantRefNum: args.merchantRefNum,
      status: "pending",
      amountInCents: args.amountInCents,
    });
  },
});

// Internal action: call Paysafe API to create payment handle
export const callPaysafeCreatePaymentHandle = internalAction({
  args: {
    paymentHandleId: v.id("paymentHandles"),
    merchantRefNum: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    amountInCents: v.int64(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.PAYSAFE_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.paysafe.updatePaymentHandleStatus, {
        paymentHandleId: args.paymentHandleId,
        status: "failed",
        errorMessage: "PAYSAFE_API_KEY not configured",
      });
      return;
    }

    const baseUrl = process.env.PAYSAFE_BASE_URL ?? "https://api.test.paysafe.com";
    const authHeader = `Basic ${btoa(apiKey)}`;

    const body = {
      merchantRefNum: args.merchantRefNum,
      transactionType: "PAYMENT",
      paymentType: "INTERAC_ETRANSFER",
      amount: Number(args.amountInCents),
      currencyCode: "CAD",
      customerIp: "172.0.0.1",
      consumerId: args.email,
      profile: {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
      },
      billingDetails: {
        street1: "100 Queen Street West",
        city: "Toronto",
        state: "ON",
        zip: "M5H 2N2",
        country: "CA",
      },
      interacEtransfer: {
        consumerId: args.email,
        type: "EMAIL",
      },
    };

    try {
      const response = await fetch(`${baseUrl}/paymenthub/v1/paymenthandles`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error?.message ?? `API error: ${response.status}`;
        if (data.error?.fieldErrors?.length) {
          const fields = data.error.fieldErrors
            .map((fe: { field: string; error: string }) => `${fe.field}: ${fe.error}`)
            .join("; ");
          errorMessage = `${errorMessage} (${fields})`;
        }
        await ctx.runMutation(internal.paysafe.updatePaymentHandleStatus, {
          paymentHandleId: args.paymentHandleId,
          status: "failed",
          errorMessage,
          paysafeResponse: JSON.stringify(data),
        });
        return;
      }

      await ctx.runMutation(internal.paysafe.updatePaymentHandleStatus, {
        paymentHandleId: args.paymentHandleId,
        status: "initiated",
        paymentHandleToken: data.paymentHandleToken,
        redirectUrl: data.links?.find((l: { rel: string }) => l.rel === "redirect_payment")?.href,
        paysafeResponse: JSON.stringify(data),
      });
    } catch (error) {
      await ctx.runMutation(internal.paysafe.updatePaymentHandleStatus, {
        paymentHandleId: args.paymentHandleId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Internal action: process a payable payment handle by creating a payment
export const processPayment = internalAction({
  args: {
    paymentHandleId: v.id("paymentHandles"),
    paymentHandleToken: v.string(),
    merchantRefNum: v.string(),
    amountInCents: v.int64(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.PAYSAFE_API_KEY;
    if (!apiKey) return;

    const baseUrl = process.env.PAYSAFE_BASE_URL ?? "https://api.test.paysafe.com";
    const authHeader = `Basic ${btoa(apiKey)}`;

    const body = {
      merchantRefNum: args.merchantRefNum,
      amount: Number(args.amountInCents),
      currencyCode: "CAD",
      paymentHandleToken: args.paymentHandleToken,
    };

    try {
      const response = await fetch(`${baseUrl}/paymenthub/v1/payments`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        await ctx.runMutation(internal.paysafe.updatePaymentHandleStatus, {
          paymentHandleId: args.paymentHandleId,
          status: "failed",
          errorMessage: data.error?.message ?? `Payment error: ${response.status}`,
          paysafeResponse: JSON.stringify(data),
        });
        return;
      }

      await ctx.runMutation(internal.paysafe.updatePaymentHandleStatus, {
        paymentHandleId: args.paymentHandleId,
        status: "processing",
        paysafeResponse: JSON.stringify(data),
      });
    } catch (error) {
      await ctx.runMutation(internal.paysafe.updatePaymentHandleStatus, {
        paymentHandleId: args.paymentHandleId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Shared helper: sync settlement status and send notifications based on payment handle status
async function syncSettlementStatus(
  ctx: { db: any; scheduler: any },
  handle: { orderUserId: any; orderId: any },
  status: string,
) {
  if (status === "completed") {
    await ctx.db.patch(handle.orderUserId, { settlementStatus: "confirmed" });

    const orderUser = await ctx.db.get(handle.orderUserId);
    if (orderUser) {
      const order = await ctx.db.get(handle.orderId);
      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
        userId: orderUser.userId,
        title: "Payment Confirmed",
        body: `Your payment for ${order?.name ?? "the order"} has been confirmed!`,
        data: { type: "payment_confirmed", orderId: handle.orderId },
      });
    }
  } else if (status === "initiated" || status === "payable" || status === "processing") {
    await ctx.db.patch(handle.orderUserId, { settlementStatus: "claimed" });
  } else if (status === "failed" || status === "expired") {
    await ctx.db.patch(handle.orderUserId, { settlementStatus: "unpaid" });

    if (status === "failed") {
      const orderUser = await ctx.db.get(handle.orderUserId);
      if (orderUser) {
        const order = await ctx.db.get(handle.orderId);
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
          userId: orderUser.userId,
          title: "Payment Issue",
          body: `There was an issue with your payment for ${order?.name ?? "the order"}. Please try again.`,
          data: { type: "payment_failed", orderId: handle.orderId },
        });
      }
    }
  }
}

// Internal mutation: update payment handle status and sync settlement status
export const updatePaymentHandleStatus = internalMutation({
  args: {
    paymentHandleId: v.id("paymentHandles"),
    status: paymentHandleStatusValidator,
    paymentHandleToken: v.optional(v.string()),
    redirectUrl: v.optional(v.string()),
    paysafeResponse: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = await ctx.db.get(args.paymentHandleId);
    if (!handle) return;

    const updates: Record<string, unknown> = { status: args.status };
    if (args.paymentHandleToken !== undefined) updates.paymentHandleId = args.paymentHandleToken;
    if (args.redirectUrl !== undefined) updates.redirectUrl = args.redirectUrl;
    if (args.paysafeResponse !== undefined) updates.paysafeResponse = args.paysafeResponse;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;

    await ctx.db.patch(args.paymentHandleId, updates);
    await syncSettlementStatus(ctx, handle, args.status);
  },
});

// Internal query: find payment handle by merchant ref num
export const findPaymentHandleByMerchantRef = internalQuery({
  args: { merchantRefNum: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentHandles")
      .withIndex("by_merchantRefNum", (q) => q.eq("merchantRefNum", args.merchantRefNum))
      .first();
  },
});

// Internal mutation: process webhook event
export const processWebhook = internalMutation({
  args: {
    paymentHandleId: v.id("paymentHandles"),
    eventType: v.string(),
    paysafeResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = await ctx.db.get(args.paymentHandleId);
    if (!handle) return;

    // Map Paysafe event types to our status
    let newStatus: string | null = null;
    switch (args.eventType) {
      case "PAYMENT_HANDLE_PAYABLE":
        newStatus = "payable";
        break;
      case "PAYMENT_COMPLETED":
        newStatus = "completed";
        break;
      case "PAYMENT_FAILED":
        newStatus = "failed";
        break;
      case "PAYMENT_HANDLE_EXPIRED":
        newStatus = "expired";
        break;
    }

    if (!newStatus) return;

    // Update the payment handle
    const updates: Record<string, unknown> = { status: newStatus };
    if (args.paysafeResponse) updates.paysafeResponse = args.paysafeResponse;

    await ctx.db.patch(args.paymentHandleId, updates);
    await syncSettlementStatus(ctx, handle, newStatus);
  },
});
