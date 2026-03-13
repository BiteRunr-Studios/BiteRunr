import { v } from "convex/values";
import { query } from "./_generated/server";
import { getUserId } from "./authHelper";

// List all order-local pickup locations for an order
export const listForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const orderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", args.orderId),
      )
      .first();

    if (!orderUser) return [];

    const orderLocations = await ctx.db
      .query("orderLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    return orderLocations.map((orderLocation) => ({
      id: orderLocation._id,
      orderId: orderLocation.orderId,
      name: orderLocation.name,
      createdAt: orderLocation._creationTime,
    }));
  },
});

export const get = query({
  args: { id: v.id("orderLocations") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const orderLocation = await ctx.db.get(args.id);
    if (!orderLocation) return null;

    const orderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", orderLocation.orderId),
      )
      .first();

    if (!orderUser) return null;

    return orderLocation;
  },
});
