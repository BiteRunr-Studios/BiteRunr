import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getUserId } from "./authHelper";

// List items for a specific user at a specific location in an order
export const listForUserLocation = query({
    args: {
        orderUserId: v.id("orderUsers"),
        orderLocationId: v.id("orderLocations"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return [];

        // Verify the orderUser belongs to the current user
        const orderUser = await ctx.db.get(args.orderUserId);
        if (!orderUser || orderUser.userId !== userId) {
            return [];
        }

        const orderItems = await ctx.db
            .query("orderItems")
            .withIndex("by_orderUserId", (q) =>
                q.eq("orderUserId", args.orderUserId),
            )
            .filter((q) =>
                q.eq(q.field("orderLocationId"), args.orderLocationId),
            )
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
            }),
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
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        if (!Number.isInteger(args.quantity) || args.quantity < 1) {
            throw new Error("Quantity must be a whole number of at least 1");
        }

        // Verify the orderUser belongs to the current user
        const orderUser = await ctx.db.get(args.orderUserId);
        if (!orderUser || orderUser.userId !== userId) {
            throw new Error("Not authorized");
        }

        // Check if order exists and is paused (run has started)
        const order = await ctx.db.get(orderUser.orderId);
        if (!order) {
            throw new Error("Order not found");
        }
        if (order.paused) {
            throw new Error("Cannot add items - the run has already started");
        }

        // Check if item already exists with same comments
        const existing = await ctx.db
            .query("orderItems")
            .withIndex("by_orderUserId_itemId_comments", (q) =>
                q
                    .eq("orderUserId", args.orderUserId)
                    .eq("itemId", args.itemId)
                    .eq("comments", args.comments),
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
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        if (!Number.isInteger(args.quantity) || args.quantity < 1) {
            throw new Error("Quantity must be a whole number of at least 1");
        }

        const orderItem = await ctx.db.get(args.orderItemId);
        if (!orderItem) throw new Error("Order item not found");

        // Verify the order user belongs to current user
        const orderUser = await ctx.db.get(orderItem.orderUserId);
        if (!orderUser || orderUser.userId !== userId) {
            throw new Error("Not authorized");
        }

        // Check if order exists and is paused (run has started)
        const order = await ctx.db.get(orderUser.orderId);
        if (!order) {
            throw new Error("Order not found");
        }
        if (order.paused) {
            throw new Error(
                "Cannot update items - the run has already started",
            );
        }

        await ctx.db.patch(args.orderItemId, {
            quantity: args.quantity,
            comments: args.comments,
        });

        return args.orderItemId;
    },
});

// Get order summary for creator (all items grouped by item ID, with comments as sub-items)
export const getOrderSummary = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        // Verify user is the order creator
        const order = await ctx.db.get(args.orderId);
        if (!order || order.creatorId !== userId) {
            return null;
        }

        // Get all order users (for counting total people)
        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        // Get all order locations for this order
        const orderLocations = await ctx.db
            .query("orderLocations")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        // Build location info with order location IDs
        const locations: Array<{
            orderLocationId: string;
            locationId: string;
            name: string;
        }> = [];
        const locationLookup: Map<
            string,
            { id: string; name: string; orderLocationId: string }
        > = new Map();

        for (const ol of orderLocations) {
            const location = await ctx.db.get(ol.locationId);
            if (location) {
                const locInfo = {
                    id: location._id,
                    name: location.name,
                    orderLocationId: ol._id,
                };
                locationLookup.set(ol._id, locInfo);
                locations.push({
                    orderLocationId: ol._id,
                    locationId: location._id,
                    name: location.name,
                });
            }
        }

        // Get all order items and group by location, then by itemId
        const locationSummaries = await Promise.all(
            orderLocations.map(async (orderLocation) => {
                const locationInfo = locationLookup.get(orderLocation._id);

                // Get all items for this location
                const orderItems = await ctx.db
                    .query("orderItems")
                    .withIndex("by_orderLocationId", (q) =>
                        q.eq("orderLocationId", orderLocation._id),
                    )
                    .collect();

                // Group items by itemId and calculate subtotal
                const itemGroups: Map<
                    string,
                    {
                        itemId: string;
                        itemName: string;
                        baseQuantity: number;
                        priceInCents: number | null;
                        subItems: Array<{
                            comment: string;
                            quantity: number;
                            priceInCents: number | null;
                        }>;
                    }
                > = new Map();

                let subtotalInCents = 0;
                let hasPrices = false;

                for (const oi of orderItems) {
                    const item = await ctx.db.get(oi.itemId);
                    const itemName = item?.name ?? "Unknown Item";
                    const priceInCents =
                        oi.priceInCents != null
                            ? Number(oi.priceInCents)
                            : null;

                    if (priceInCents !== null) {
                        subtotalInCents += priceInCents * oi.quantity;
                        hasPrices = true;
                    }

                    if (!itemGroups.has(oi.itemId)) {
                        itemGroups.set(oi.itemId, {
                            itemId: oi.itemId,
                            itemName,
                            baseQuantity: 0,
                            priceInCents: null,
                            subItems: [],
                        });
                    }

                    const group = itemGroups.get(oi.itemId)!;

                    if (oi.comments && oi.comments.trim()) {
                        // Item has comments - add as sub-item
                        group.subItems.push({
                            comment: oi.comments,
                            quantity: oi.quantity,
                            priceInCents,
                        });
                    } else {
                        // Item without comments - add to base quantity
                        group.baseQuantity += oi.quantity;
                        group.priceInCents = priceInCents;
                    }
                }

                // Convert map to array and calculate total quantities
                const items = Array.from(itemGroups.values()).map((group) => ({
                    itemId: group.itemId,
                    itemName: group.itemName,
                    baseQuantity: group.baseQuantity,
                    priceInCents: group.priceInCents,
                    totalQuantity:
                        group.baseQuantity +
                        group.subItems.reduce(
                            (sum, si) => sum + si.quantity,
                            0,
                        ),
                    subItems: group.subItems,
                }));

                // Sort by item name
                items.sort((a, b) => a.itemName.localeCompare(b.itemName));

                // Get receipt total for this location (includes tax)
                const receiptTotalInCents =
                    orderLocation.receiptTotalInCents != null
                        ? Number(orderLocation.receiptTotalInCents)
                        : null;

                // Calculate tax (receipt total - item subtotal)
                const taxInCents =
                    receiptTotalInCents !== null && hasPrices
                        ? Math.max(0, receiptTotalInCents - subtotalInCents)
                        : null;

                return {
                    orderLocationId: orderLocation._id,
                    locationId: orderLocation.locationId,
                    locationName: locationInfo?.name ?? "Unknown Location",
                    items,
                    itemCount: items.reduce(
                        (sum, item) => sum + item.totalQuantity,
                        0,
                    ),
                    // Price breakdown
                    subtotalInCents: hasPrices ? subtotalInCents : null,
                    taxInCents,
                    totalInCents: receiptTotalInCents,
                };
            }),
        );

        return {
            order: {
                id: order._id,
                name: order.name,
                comments: order.comments,
                paused: order.paused,
                createdAt: order._creationTime,
            },
            locations,
            locationSummaries,
            totalItems: locationSummaries.reduce(
                (sum, ls) => sum + ls.itemCount,
                0,
            ),
            totalPeople: orderUsers.length,
        };
    },
});

// Remove an order item
export const remove = mutation({
    args: { orderItemId: v.id("orderItems") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const orderItem = await ctx.db.get(args.orderItemId);
        if (!orderItem) throw new Error("Order item not found");

        // Verify the order user belongs to current user
        const orderUser = await ctx.db.get(orderItem.orderUserId);
        if (!orderUser || orderUser.userId !== userId) {
            throw new Error("Not authorized");
        }

        // Check if order exists and is paused (run has started)
        const order = await ctx.db.get(orderUser.orderId);
        if (!order) {
            throw new Error("Order not found");
        }
        if (order.paused) {
            throw new Error(
                "Cannot remove items - the run has already started",
            );
        }

        await ctx.db.delete(args.orderItemId);
        return true;
    },
});
