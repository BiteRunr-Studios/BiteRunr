import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";
import { orderStatusValidator } from "./schema";

// List all orders for the current user (as creator or participant)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Get orders where user is a participant
    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const orderIds = orderUsers.map((ou) => ou.orderId);

    // Fetch all orders
    const orders = await Promise.all(
      orderIds.map(async (orderId) => {
        const order = await ctx.db.get(orderId);
        if (!order) return null;

        const creator = await ctx.db.get(order.creatorId);

        return {
          ...order,
          creator: creator
            ? {
                id: creator._id,
                firstName: creator.firstName,
                lastName: creator.lastName,
                avatarUrl: creator.avatarUrl,
              }
            : null,
        };
      })
    );

    return orders.filter((o) => o !== null);
  },
});

// Get detailed order info for home tab display
export const getWithDetails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Get orders where user is a participant
    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const results = await Promise.all(
      userOrderUsers.map(async (userOrderUser) => {
        const order = await ctx.db.get(userOrderUser.orderId);
        if (!order) return null;

        // Get all order users for this order
        const orderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        // Enrich order users with user profiles
        const enrichedOrderUsers = await Promise.all(
          orderUsers.map(async (ou) => {
            const user = await ctx.db.get(ou.userId);
            return {
              id: ou._id,
              userId: ou.userId,
              orderId: ou.orderId,
              status: ou.status,
              settlementStatus: ou.settlementStatus,
              amountOwed: ou.amountOwed.toString(),
              createdAt: ou._creationTime,
              user: user
                ? {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatarUrl: user.avatarUrl,
                  }
                : null,
            };
          })
        );

        // Count items
        const orderLocations = await ctx.db
          .query("orderLocations")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        let itemsCount = 0;
        for (const ol of orderLocations) {
          const items = await ctx.db
            .query("orderItems")
            .withIndex("by_orderLocationId", (q) => q.eq("orderLocationId", ol._id))
            .collect();
          itemsCount += items.reduce((sum, item) => sum + item.quantity, 0);
        }

        return {
          order: {
            id: order._id,
            name: order.name,
            creatorId: order.creatorId,
            comments: order.comments,
            status: order.status,
            paused: order.paused,
            createdAt: order._creationTime,
          },
          orderUsers: enrichedOrderUsers,
          itemsCount,
          peopleCount: orderUsers.length,
        };
      })
    );

    return results.filter((r) => r !== null);
  },
});

// Get a single order with all details (for order detail page)
export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    // Get all order users
    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Verify user is part of this order
    const isParticipant = orderUsers.some((ou) => ou.userId === userId);
    if (!isParticipant) return null;

    // Enrich order users with user profiles
    const enrichedOrderUsers = await Promise.all(
      orderUsers.map(async (ou) => {
        const user = await ctx.db.get(ou.userId);
        return {
          id: ou._id,
          userId: ou.userId,
          orderId: ou.orderId,
          status: ou.status,
          amountOwed: ou.amountOwed,
          createdAt: ou._creationTime,
          user: user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
              }
            : null,
        };
      })
    );

    // Get order locations
    const orderLocations = await ctx.db
      .query("orderLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Count total items
    let totalItems = 0;
    for (const ol of orderLocations) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_orderLocationId", (q) => q.eq("orderLocationId", ol._id))
        .collect();
      totalItems += items.reduce((sum, item) => sum + item.quantity, 0);
    }

    return {
      count: totalItems,
      orderUsers: enrichedOrderUsers,
      order: {
        id: order._id,
        name: order.name,
        creatorId: order.creatorId,
        comments: order.comments,
        status: order.status,
        paused: order.paused,
        createdAt: order._creationTime,
      },
      orderLocations: orderLocations.map((ol) => ({
        id: ol._id,
        orderId: ol.orderId,
        locationId: ol.locationId,
        createdAt: ol._creationTime,
      })),
    };
  },
});

// Create a new order
export const create = mutation({
  args: {
    name: v.string(),
    comments: v.optional(v.string()),
    locationIds: v.array(v.id("locations")),
    friendIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      name: args.name,
      creatorId: userId,
      comments: args.comments,
      status: "active",
      paused: false,
    });

    // Create order locations
    for (const locationId of args.locationIds) {
      await ctx.db.insert("orderLocations", {
        orderId,
        locationId,
      });
    }

    // Add creator as order user
    await ctx.db.insert("orderUsers", {
      userId,
      orderId,
      status: "ordering",
      settlementStatus: "unpaid",
      amountOwed: 0,
    });

    // Add friends as order users
    for (const friendId of args.friendIds) {
      await ctx.db.insert("orderUsers", {
        userId: friendId,
        orderId,
        status: "ordering",
        settlementStatus: "unpaid",
        amountOwed: 0,
      });
    }

    return orderId;
  },
});

// Update an order
export const update = mutation({
  args: {
    orderId: v.id("orders"),
    name: v.optional(v.string()),
    comments: v.optional(v.string()),
    status: v.optional(orderStatusValidator),
    paused: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Only creator can update order
    if (order.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.comments !== undefined) updates.comments = args.comments;
    if (args.status !== undefined) updates.status = args.status;
    if (args.paused !== undefined) updates.paused = args.paused;

    await ctx.db.patch(args.orderId, updates);
    return args.orderId;
  },
});

// Cancel an order (soft delete by setting status)
export const cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Only creator can cancel
    if (order.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.orderId, { status: "cancelled" });
    return true;
  },
});
