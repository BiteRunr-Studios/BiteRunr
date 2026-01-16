import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// List items for a specific user at a specific location in an order
export const listForUserLocation = query({
  args: {
    orderUserId: v.id("orderUsers"),
    orderLocationId: v.id("orderLocations"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Verify the orderUser belongs to the current user
    const orderUser = await ctx.db.get(args.orderUserId);
    if (!orderUser || orderUser.userId !== userId) {
      return [];
    }

    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId", (q) => q.eq("orderUserId", args.orderUserId))
      .filter((q) => q.eq(q.field("orderLocationId"), args.orderLocationId))
      .collect();

    // Enrich with item details
    const enrichedItems = await Promise.all(
      orderItems.map(async (oi) => {
        const item = await ctx.db.get(oi.itemId);
        return {
          id: oi._id,
          orderLocationId: oi.orderLocationId,
          orderUserId: oi.orderUserId,
          itemId: oi.itemId,
          comments: oi.comments,
          quantity: oi.quantity,
          createdAt: oi._creationTime,
          item: item
            ? {
                id: item._id,
                name: item.name,
                locationId: item.locationId,
                createdAt: item._creationTime,
              }
            : null,
        };
      })
    );

    return enrichedItems;
  },
});

// Add an item to an order user's cart
export const add = mutation({
  args: {
    orderLocationId: v.id("orderLocations"),
    orderUserId: v.id("orderUsers"),
    itemId: v.id("items"),
    comments: v.optional(v.string()),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    // Verify the orderUser belongs to the current user
    const orderUser = await ctx.db.get(args.orderUserId);
    if (!orderUser || orderUser.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Check if item already exists with same comments
    const existing = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId_itemId_comments", (q) =>
        q
          .eq("orderUserId", args.orderUserId)
          .eq("itemId", args.itemId)
          .eq("comments", args.comments)
      )
      .first();

    if (existing) {
      // Update quantity instead of creating new
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
      });
      return existing._id;
    }

    return await ctx.db.insert("orderItems", {
      orderLocationId: args.orderLocationId,
      orderUserId: args.orderUserId,
      itemId: args.itemId,
      comments: args.comments,
      quantity: args.quantity,
    });
  },
});

// Update an order item (quantity and comments)
export const update = mutation({
  args: {
    orderItemId: v.id("orderItems"),
    quantity: v.number(),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem) throw new Error("Order item not found");

    // Verify the order user belongs to current user
    const orderUser = await ctx.db.get(orderItem.orderUserId);
    if (!orderUser || orderUser.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.orderItemId, {
      quantity: args.quantity,
      comments: args.comments,
    });

    return args.orderItemId;
  },
});

// Remove an order item
export const remove = mutation({
  args: { orderItemId: v.id("orderItems") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem) throw new Error("Order item not found");

    // Verify the order user belongs to current user
    const orderUser = await ctx.db.get(orderItem.orderUserId);
    if (!orderUser || orderUser.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.orderItemId);
    return true;
  },
});
