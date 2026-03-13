import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId } from "./authHelper";

function normalizeEntryLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function buildParticipantName(firstName?: string, lastName?: string) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "Unknown User";
}

export const getForUserLocation = query({
  args: {
    orderUserId: v.id("orderUsers"),
    orderLocationId: v.id("orderLocations"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return { text: "", entries: [] };

    const orderUser = await ctx.db.get(args.orderUserId);
    if (!orderUser || orderUser.userId !== userId) {
      return { text: "", entries: [] };
    }

    const orderLocation = await ctx.db.get(args.orderLocationId);
    if (!orderLocation || orderLocation.orderId !== orderUser.orderId) {
      return { text: "", entries: [] };
    }

    const entries = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId_orderLocationId", (q) =>
        q
          .eq("orderUserId", args.orderUserId)
          .eq("orderLocationId", args.orderLocationId),
      )
      .collect();

    const sortedEntries = [...entries].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );

    return {
      text: sortedEntries.map((entry) => entry.text).join("\n"),
      entries: sortedEntries.map((entry) => ({
        id: entry._id,
        text: entry.text,
        sortOrder: entry.sortOrder,
        priceInCents:
          entry.priceInCents !== undefined ? Number(entry.priceInCents) : null,
      })),
    };
  },
});

export const replaceForUserLocation = mutation({
  args: {
    orderUserId: v.id("orderUsers"),
    orderLocationId: v.id("orderLocations"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const orderUser = await ctx.db.get(args.orderUserId);
    if (!orderUser || orderUser.userId !== userId) {
      throw new Error("Not authorized");
    }

    const orderLocation = await ctx.db.get(args.orderLocationId);
    if (!orderLocation || orderLocation.orderId !== orderUser.orderId) {
      throw new Error("Invalid order location");
    }

    const order = await ctx.db.get(orderUser.orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    if (order.paused) {
      throw new Error("Cannot update items - the run has already started");
    }

    const normalizedLines = normalizeEntryLines(args.text);

    const existingEntries = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId_orderLocationId", (q) =>
        q
          .eq("orderUserId", args.orderUserId)
          .eq("orderLocationId", args.orderLocationId),
      )
      .collect();

    for (const entry of existingEntries) {
      await ctx.db.delete(entry._id);
    }

    for (const [index, line] of normalizedLines.entries()) {
      await ctx.db.insert("orderItems", {
        orderLocationId: args.orderLocationId,
        orderUserId: args.orderUserId,
        text: line,
        sortOrder: index,
      });
    }

    return {
      count: normalizedLines.length,
      text: normalizedLines.join("\n"),
    };
  },
});

export const listForOrderUser = query({
  args: {
    orderUserId: v.id("orderUsers"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const targetOrderUser = await ctx.db.get(args.orderUserId);
    if (!targetOrderUser) return [];

    const callerOrderUser = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId_orderId", (q) =>
        q.eq("userId", userId).eq("orderId", targetOrderUser.orderId),
      )
      .first();

    if (!callerOrderUser) return [];

    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId", (q) => q.eq("orderUserId", args.orderUserId))
      .collect();

    const orderLocations = await ctx.db
      .query("orderLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", targetOrderUser.orderId))
      .collect();
    const locationById = new Map(
      orderLocations.map((location) => [location._id, location]),
    );

    return [...orderItems]
      .sort((left, right) => {
        const leftLocation =
          locationById.get(left.orderLocationId)?._creationTime ?? 0;
        const rightLocation =
          locationById.get(right.orderLocationId)?._creationTime ?? 0;
        return leftLocation - rightLocation || left.sortOrder - right.sortOrder;
      })
      .map((orderItem) => ({
        id: orderItem._id,
        orderLocationId: orderItem.orderLocationId,
        locationName:
          locationById.get(orderItem.orderLocationId)?.name ?? "Unknown Location",
        text: orderItem.text,
        sortOrder: orderItem.sortOrder,
        priceInCents:
          orderItem.priceInCents !== undefined
            ? Number(orderItem.priceInCents)
            : null,
      }));
  },
});

export const getOrderSummary = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.creatorId !== userId) {
      return null;
    }

    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const orderLocations = await ctx.db
      .query("orderLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const userNameByOrderUserId = new Map<string, string>();
    for (const orderUser of orderUsers) {
      const user = await ctx.db.get(orderUser.userId);
      userNameByOrderUserId.set(
        orderUser._id,
        buildParticipantName(user?.firstName, user?.lastName),
      );
    }

    const locationSummaries = await Promise.all(
      orderLocations.map(async (orderLocation) => {
        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderLocationId_sortOrder", (q) =>
            q.eq("orderLocationId", orderLocation._id),
          )
          .collect();

        const sortedItems = [...orderItems].sort(
          (left, right) => left.sortOrder - right.sortOrder,
        );

        const lines = sortedItems.map((orderItem) => ({
          id: orderItem._id,
          orderUserId: orderItem.orderUserId,
          text: orderItem.text,
          sortOrder: orderItem.sortOrder,
          userName:
            userNameByOrderUserId.get(orderItem.orderUserId) ?? "Unknown User",
          priceInCents:
            orderItem.priceInCents !== undefined
              ? Number(orderItem.priceInCents)
              : null,
        }));

        const hasAnyPrices = lines.some((line) => line.priceInCents !== null);
        const subtotalInCents = hasAnyPrices
          ? lines.reduce(
              (sum, line) => sum + (line.priceInCents ?? 0),
              0,
            )
          : null;
        const totalInCents =
          orderLocation.receiptTotalInCents !== undefined
            ? Number(orderLocation.receiptTotalInCents)
            : null;
        const taxInCents =
          subtotalInCents !== null && totalInCents !== null
            ? Math.max(0, totalInCents - subtotalInCents)
            : null;

        return {
          orderLocationId: orderLocation._id,
          locationName: orderLocation.name,
          lines,
          itemCount: lines.length,
          subtotalInCents,
          taxInCents,
          totalInCents,
        };
      }),
    );

    const activeLocationSummaries = locationSummaries.filter(
      (summary) => summary.itemCount > 0,
    );
    const activeLocationIds = new Set(
      activeLocationSummaries.map((summary) => summary.orderLocationId),
    );
    const activeLocations = orderLocations
      .filter((location) => activeLocationIds.has(location._id))
      .map((location) => ({
        id: location._id,
        orderLocationId: location._id,
        name: location.name,
      }));

    return {
      order: {
        id: order._id,
        name: order.name,
        comments: order.comments,
        paused: order.paused,
        createdAt: order._creationTime,
      },
      locations: activeLocations,
      locationSummaries: activeLocationSummaries,
      totalItems: activeLocationSummaries.reduce(
        (sum, summary) => sum + summary.itemCount,
        0,
      ),
      totalPeople: orderUsers.length,
    };
  },
});
