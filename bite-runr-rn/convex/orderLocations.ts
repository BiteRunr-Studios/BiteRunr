import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

// List all locations for an order (for item selection)
export const listForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Verify user is a participant
    const orderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", args.orderId)
      )
      .first();

    if (!orderUser) return [];

    const orderLocations = await ctx.db
      .query("orderLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Enrich with location details
    const enrichedLocations = await Promise.all(
      orderLocations.map(async (ol) => {
        const location = await ctx.db.get(ol.locationId);
        return {
          locationId: ol.locationId,
          orderLocationId: ol._id,
          locationName: location?.name ?? "Unknown",
        };
      })
    );

    return enrichedLocations;
  },
});

// Get a single order location by ID
export const get = query({
  args: { id: v.id("orderLocations") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const orderLocation = await ctx.db.get(args.id);
    if (!orderLocation) return null;

    // Verify user is a participant in this order
    const orderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", orderLocation.orderId)
      )
      .first();

    if (!orderUser) return null;

    return orderLocation;
  },
});
