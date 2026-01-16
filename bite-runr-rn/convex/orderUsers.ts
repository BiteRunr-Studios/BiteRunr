import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";
import { orderUserStatusValidator } from "./schema";

// Get the current user's orderUser for a specific order
export const getForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
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
    const userId = await auth.getUserId(ctx);
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
    const userId = await auth.getUserId(ctx);
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
