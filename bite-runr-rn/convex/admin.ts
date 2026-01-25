import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Admin functions for dashboard management (no auth required)
// These should be protected at the network level in production

// ============ LOCATIONS ============

export const listLocations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("locations").withIndex("by_name").collect();
  },
});

export const getLocation = query({
  args: { id: v.id("locations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createLocation = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("locations", {
      name: args.name,
    });
  },
});

export const updateLocation = mutation({
  args: {
    id: v.id("locations"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return await ctx.db.get(id);
  },
});

export const deleteLocation = mutation({
  args: { id: v.id("locations") },
  handler: async (ctx, args) => {
    // Delete all items associated with this location first
    const items = await ctx.db
      .query("items")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const deleteLocations = mutation({
  args: { ids: v.array(v.id("locations")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      // Delete all items associated with this location first
      const items = await ctx.db
        .query("items")
        .withIndex("by_locationId", (q) => q.eq("locationId", id))
        .collect();

      for (const item of items) {
        await ctx.db.delete(item._id);
      }

      await ctx.db.delete(id);
    }
  },
});

// ============ ITEMS ============

export const listItems = query({
  args: { locationId: v.optional(v.id("locations")) },
  handler: async (ctx, args) => {
    if (args.locationId) {
      return await ctx.db
        .query("items")
        .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId!))
        .collect();
    }
    return await ctx.db.query("items").collect();
  },
});

export const getItem = query({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createItem = mutation({
  args: {
    name: v.string(),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    // Check if item already exists at this location
    const existing = await ctx.db
      .query("items")
      .withIndex("by_name_locationId", (q) =>
        q.eq("name", args.name).eq("locationId", args.locationId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("items", {
      name: args.name,
      locationId: args.locationId,
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("items"),
    name: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return await ctx.db.get(id);
  },
});

export const deleteItem = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const deleteItems = mutation({
  args: { ids: v.array(v.id("items")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});

// ============ STATS ============

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const locations = await ctx.db.query("locations").collect();
    const items = await ctx.db.query("items").collect();
    const users = await ctx.db.query("users").collect();
    const orders = await ctx.db.query("orders").collect();

    return {
      totalLocations: locations.length,
      totalItems: items.length,
      totalUsers: users.length,
      totalOrders: orders.length,
      activeOrders: orders.filter((o) => o.status === "active").length,
    };
  },
});
