import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Search items at a location
export const search = query({
  args: {
    locationId: v.id("locations"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    if (args.query.trim().length === 0) {
      // Return all items for the location if no search query
      return await ctx.db
        .query("items")
        .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
        .collect();
    }

    // Use search index for full-text search
    const searchResults = await ctx.db
      .query("items")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("locationId", args.locationId)
      )
      .collect();

    return searchResults;
  },
});

// List all items for a location
export const listByLocation = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("items")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .collect();
  },
});

// Get a single item by ID
export const get = query({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new item at a location
export const create = mutation({
  args: {
    name: v.string(),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

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
