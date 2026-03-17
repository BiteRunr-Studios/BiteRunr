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

// Leave an order (non-creator only, during ordering phase)
export const leaveOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "active" && order.status !== "created") {
      throw new Error("Order is no longer active");
    }
    if (order.paused) throw new Error("Cannot leave after the run has started");
    if (order.creatorId === userId) {
      throw new Error("The creator cannot leave the order");
    }

    const orderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", args.orderId)
      )
      .first();
    if (!orderUser) throw new Error("Not a participant in this order");

    // Delete all user's order items
    const userItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId", (q) => q.eq("orderUserId", orderUser._id))
      .collect();
    for (const item of userItems) {
      await ctx.db.delete(item._id);
    }

    // Delete the orderUser record
    await ctx.db.delete(orderUser._id);
  },
});

// Remove a participant from an order (creator only, during ordering phase)
export const removeFromOrder = mutation({
  args: {
    orderId: v.id("orders"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "active" && order.status !== "created") {
      throw new Error("Order is no longer active");
    }
    if (order.paused) throw new Error("Cannot remove members after the run has started");
    if (order.creatorId !== userId) {
      throw new Error("Only the creator can remove participants");
    }
    if (args.targetUserId === order.creatorId) {
      throw new Error("Cannot remove the creator from the order");
    }

    const targetOrderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", args.targetUserId).eq("orderId", args.orderId)
      )
      .first();
    if (!targetOrderUser) throw new Error("User is not a participant in this order");

    // Delete all target user's order items
    const userItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId", (q) => q.eq("orderUserId", targetOrderUser._id))
      .collect();
    for (const item of userItems) {
      await ctx.db.delete(item._id);
    }

    // Delete the orderUser record
    await ctx.db.delete(targetOrderUser._id);

    // Notify the removed user
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
      userId: args.targetUserId,
      title: "Removed from Order",
      body: `You were removed from the order "${order.name}"`,
      data: { type: "removed_from_order", orderId: args.orderId },
    });
  },
});
