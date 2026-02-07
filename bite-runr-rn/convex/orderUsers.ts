import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getUserId } from "./authHelper";
import { orderUserStatusValidator } from "./schema";

// Get the current user's orderUser for a specific order
export const getForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", args.orderId)
      )
      .first();
  },
});

// Set the status of the current user in an order
export const setStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderUserStatusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const orderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", args.orderId)
      )
      .first();

    if (!orderUser) {
      throw new Error("Not a participant in this order");
    }

    await ctx.db.patch(orderUser._id, { status: args.status });

    // If user marked themselves as done, check if all users are now done
    if (args.status === "done") {
      const order = await ctx.db.get(args.orderId);
      if (!order) return orderUser._id;

      // Get all order users
      const allOrderUsers = await ctx.db
        .query("orderUsers")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();

      // Check if all users are done
      const allDone = allOrderUsers.every((ou) =>
        ou._id === orderUser._id ? true : ou.status === "done"
      );

      // If all done and current user is not the creator, notify the creator
      if (allDone && order.creatorId !== userId) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
          userId: order.creatorId,
          title: "Orders Ready!",
          body: `Everyone has finished ordering for ${order.name}`,
          data: { type: "orders_ready", orderId: args.orderId },
        });
      }
    }

    return orderUser._id;
  },
});

// Update amount owed for an order user (amount in cents)
export const updateAmountOwed = mutation({
  args: {
    orderUserId: v.id("orderUsers"),
    amountOwed: v.int64(), // Amount in cents (must be non-negative integer)
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate amountOwed is non-negative (bigints are always integers)
    if (args.amountOwed < 0n) {
      throw new Error("Amount owed must be non-negative (cents)");
    }

    const orderUser = await ctx.db.get(args.orderUserId);
    if (!orderUser) throw new Error("Order user not found");

    // Verify the current user is the order creator
    const order = await ctx.db.get(orderUser.orderId);
    if (!order || order.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.orderUserId, { amountOwed: args.amountOwed });
    return args.orderUserId;
  },
});

// Claim payment - user indicates they've paid externally
export const claimPayment = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    if (order.creatorId === userId) {
      throw new Error("The runner cannot claim payment on their own order");
    }

    const orderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", args.orderId)
      )
      .first();

    if (!orderUser) throw new Error("Not a participant in this order");

    if (orderUser.settlementStatus !== "unpaid") {
      throw new Error("Payment already claimed or confirmed");
    }

    if (orderUser.amountOwed <= 0n) {
      throw new Error("No amount owed");
    }

    await ctx.db.patch(orderUser._id, { settlementStatus: "claimed" });

    // Notify the order creator
    const claimingUser = await ctx.db.get(userId);
    const claimerName = claimingUser?.firstName ?? "Someone";
    const amountStr = `$${(Number(orderUser.amountOwed) / 100).toFixed(2)}`;

    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
      userId: order.creatorId,
      title: "Payment Claimed",
      body: `${claimerName} says they paid ${amountStr} for ${order.name}`,
      data: { type: "payment_claimed", orderId: args.orderId },
    });

    return orderUser._id;
  },
});

// Confirm payment - order creator confirms they received payment
export const confirmPayment = mutation({
  args: { orderUserId: v.id("orderUsers") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const orderUser = await ctx.db.get(args.orderUserId);
    if (!orderUser) throw new Error("Order user not found");

    const order = await ctx.db.get(orderUser.orderId);
    if (!order || order.creatorId !== userId) {
      throw new Error("Only the order creator can confirm payments");
    }

    if (orderUser.settlementStatus !== "claimed") {
      throw new Error("Payment must be claimed before confirmation");
    }

    await ctx.db.patch(args.orderUserId, { settlementStatus: "confirmed" });

    // Notify the payer
    const creator = await ctx.db.get(userId);
    const creatorName = creator?.firstName ?? "The runner";

    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
      userId: orderUser.userId,
      title: "Payment Confirmed",
      body: `${creatorName} confirmed your payment for ${order.name}`,
      data: { type: "payment_confirmed", orderId: orderUser.orderId },
    });

    return args.orderUserId;
  },
});
