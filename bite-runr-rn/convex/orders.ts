import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getUserId } from "./authHelper";
import { orderStatusValidator } from "./schema";

// List all orders for the current user (as creator or participant)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
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
    const userId = await getUserId(ctx);
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

        // Enrich order locations with location names
        const enrichedOrderLocations = await Promise.all(
          orderLocations.map(async (ol) => {
            const location = await ctx.db.get(ol.locationId);
            return {
              id: ol._id,
              locationId: ol.locationId,
              locationName: location?.name ?? "Unknown",
            };
          })
        );

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
          orderLocations: enrichedOrderLocations,
          itemsCount,
          peopleCount: orderUsers.length,
        };
      })
    );

    return results
      .filter((r) => r !== null)
      .sort((a, b) => b.order.createdAt - a.order.createdAt);
  },
});

// Get a single order with all details (for order detail page)
export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
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

    // Enrich order users with user profiles and item counts
    const enrichedOrderUsers = await Promise.all(
      orderUsers.map(async (ou) => {
        const user = await ctx.db.get(ou.userId);

        // Get item count for this user
        const userItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderUserId", (q) => q.eq("orderUserId", ou._id))
          .collect();
        const itemCount = userItems.reduce((sum, item) => sum + item.quantity, 0);

        return {
          id: ou._id,
          userId: ou.userId,
          orderId: ou.orderId,
          status: ou.status,
          amountOwed: ou.amountOwed,
          itemCount,
          isCreator: ou.userId === order.creatorId,
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

    // Sort: creator first, then by name
    enrichedOrderUsers.sort((a, b) => {
      if (a.isCreator) return -1;
      if (b.isCreator) return 1;
      const nameA = `${a.user?.firstName || ""} ${a.user?.lastName || ""}`;
      const nameB = `${b.user?.firstName || ""} ${b.user?.lastName || ""}`;
      return nameA.localeCompare(nameB);
    });

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

    // Calculate completion stats
    const doneCount = orderUsers.filter((ou) => ou.status === "done").length;
    const totalCount = orderUsers.length;

    return {
      count: totalItems,
      orderUsers: enrichedOrderUsers,
      completionStats: {
        done: doneCount,
        total: totalCount,
        allDone: doneCount === totalCount,
      },
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
    const userId = await getUserId(ctx);
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
      amountOwed: 0n,
    });

    // Add friends as order users
    for (const friendId of args.friendIds) {
      await ctx.db.insert("orderUsers", {
        userId: friendId,
        orderId,
        status: "ordering",
        settlementStatus: "unpaid",
        amountOwed: 0n,
      });
    }

    // Send push notifications to invited friends
    if (args.friendIds.length > 0) {
      const creator = await ctx.db.get(userId);
      const creatorName = creator ? creator.firstName : "Someone";

      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUsers, {
        userIds: args.friendIds,
        title: "Group Order Started",
        body: `A group order started with ${creatorName}`,
        data: { type: "group_order", orderId },
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
    const userId = await getUserId(ctx);
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

    // Send "Run Started" notification when ordering is locked (paused = true)
    if (args.paused === true) {
      const creator = await ctx.db.get(userId);
      const creatorName = creator ? creator.firstName : "Someone";
      const orderName = order.name || "the order";

      const orderUsers = await ctx.db
        .query("orderUsers")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();

      const memberUserIds = orderUsers
        .map((ou) => ou.userId)
        .filter((id) => id !== userId);

      if (memberUserIds.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendToUsers,
          {
            userIds: memberUserIds,
            title: "Run Started!",
            body: `${creatorName} is heading out for ${orderName}`,
            data: { type: "run_started", orderId: args.orderId },
          },
        );
      }
    }

    return args.orderId;
  },
});

// Cancel an order (soft delete by setting status)
export const cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
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

// Get active orders for home tab (created or active status)
export const getActiveOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const results = await Promise.all(
      userOrderUsers.map(async (userOrderUser) => {
        const order = await ctx.db.get(userOrderUser.orderId);
        if (!order) return null;
        if (order.status !== "active" && order.status !== "created") return null;

        const orderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        const enrichedOrderUsers = await Promise.all(
          orderUsers.map(async (ou) => {
            const user = await ctx.db.get(ou.userId);
            return {
              id: ou._id,
              firstName: user?.firstName,
              lastName: user?.lastName,
              avatarUrl: user?.avatarUrl,
            };
          })
        );

        return {
          id: order._id,
          name: order.name,
          comments: order.comments,
          status: order.status,
          paused: order.paused,
          createdAt: order._creationTime,
          orderUsers: enrichedOrderUsers,
        };
      })
    );

    return results
      .filter((r) => r !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get past orders (completed or cancelled)
export const getPastOrders = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 5;

    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const results = await Promise.all(
      userOrderUsers.map(async (userOrderUser) => {
        const order = await ctx.db.get(userOrderUser.orderId);
        if (!order) return null;
        if (order.status !== "completed") return null;

        const orderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        const enrichedOrderUsers = await Promise.all(
          orderUsers.map(async (ou) => {
            const user = await ctx.db.get(ou.userId);
            return {
              id: ou._id,
              userId: ou.userId,
              firstName: user?.firstName,
              lastName: user?.lastName,
              avatarUrl: user?.avatarUrl,
            };
          })
        );

        // Get total items and amount
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

        // Get user's amount owed
        const userAmount = orderUsers.find((ou) => ou.userId === userId)?.amountOwed ?? 0;

        return {
          id: order._id,
          name: order.name,
          comments: order.comments,
          status: order.status,
          paused: order.paused,
          createdAt: order._creationTime,
          creatorId: order.creatorId,
          orderUsers: enrichedOrderUsers,
          orderLocations: orderLocations.map((ol) => ({
            id: ol._id,
            locationId: ol.locationId,
          })),
          itemsCount,
          userAmount,
        };
      })
    );

    return results
      .filter((r) => r !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

// Get frequently ordered items
export const getFrequentItems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 6;

    // Get all order users for this user
    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Aggregate items across all orders
    const itemCounts: Map<Id<"items">, { itemId: Id<"items">; totalQuantity: number; lastOrderedAt: number }> = new Map();

    for (const orderUser of userOrderUsers) {
      // Get all order items for this order user
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderUserId", (q) => q.eq("orderUserId", orderUser._id))
        .collect();

      for (const orderItem of orderItems) {
        const existing = itemCounts.get(orderItem.itemId);
        if (existing) {
          existing.totalQuantity += orderItem.quantity;
          existing.lastOrderedAt = Math.max(existing.lastOrderedAt, orderItem._creationTime);
        } else {
          itemCounts.set(orderItem.itemId, {
            itemId: orderItem.itemId,
            totalQuantity: orderItem.quantity,
            lastOrderedAt: orderItem._creationTime,
          });
        }
      }
    }

    // Sort by quantity and take top items
    const sortedItems = Array.from(itemCounts.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);

    // Enrich with item and location details
    const enrichedItems = await Promise.all(
      sortedItems.map(async (itemData) => {
        const item = await ctx.db.get(itemData.itemId);
        if (!item) return null;

        const location = await ctx.db.get(item.locationId);

        return {
          id: item._id,
          name: item.name,
          locationName: location?.name ?? "Unknown",
          totalOrdered: itemData.totalQuantity,
          lastOrderedAt: itemData.lastOrderedAt,
        };
      })
    );

    return enrichedItems.filter((item) => item !== null);
  },
});

// Get settlement summary across all orders
export const getSettlementSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let owedToMe = 0n;
    let iOwe = 0n;

    for (const userOU of userOrderUsers) {
      const order = await ctx.db.get(userOU.orderId);
      if (!order || order.status === "cancelled") continue;

      if (order.creatorId === userId) {
        // I created this order — sum what others owe me (unsettled)
        const allOrderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        for (const ou of allOrderUsers) {
          if (ou.userId === userId) continue;
          if (ou.settlementStatus !== "confirmed" && ou.settlementStatus !== "settled_in_person") {
            owedToMe += ou.amountOwed;
          }
        }
      } else {
        // I'm invited — sum what I owe (if unsettled)
        if (userOU.settlementStatus === "unpaid" || userOU.settlementStatus === "claimed") {
          iOwe += userOU.amountOwed;
        }
      }
    }

    return {
      owedToMe: Number(owedToMe),
      iOwe: Number(iOwe),
    };
  },
});

// Get per-order breakdown of who owes you money
export const getOutstandingDebts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const debts: {
      orderId: string;
      orderName: string;
      userId: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      amountOwed: number;
    }[] = [];

    for (const userOU of userOrderUsers) {
      const order = await ctx.db.get(userOU.orderId);
      if (!order || order.status === "cancelled" || order.creatorId !== userId) continue;

      const allOrderUsers = await ctx.db
        .query("orderUsers")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      for (const ou of allOrderUsers) {
        if (ou.userId === userId) continue;
        if (ou.settlementStatus === "confirmed" || ou.settlementStatus === "settled_in_person") continue;
        if (ou.amountOwed <= 0n) continue;

        const user = await ctx.db.get(ou.userId);
        debts.push({
          orderId: order._id,
          orderName: order.name,
          userId: ou.userId,
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
          avatarUrl: user?.avatarUrl ?? null,
          amountOwed: Number(ou.amountOwed),
        });
      }
    }

    return debts.sort((a, b) => b.amountOwed - a.amountOwed);
  },
});

// Get per-order breakdown of what you still owe to other runners
export const getOutstandingPayments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const payments: {
      orderId: string;
      orderName: string;
      creatorId: string;
      creatorFirstName: string;
      creatorLastName: string;
      creatorAvatarUrl: string | null;
      amountOwed: number;
    }[] = [];

    for (const userOU of userOrderUsers) {
      const order = await ctx.db.get(userOU.orderId);
      if (!order || order.status === "cancelled" || order.creatorId === userId) {
        continue;
      }
      if (userOU.amountOwed <= 0n) continue;
      if (
        userOU.settlementStatus !== "unpaid" &&
        userOU.settlementStatus !== "claimed"
      ) {
        continue;
      }

      const creator = await ctx.db.get(order.creatorId);
      payments.push({
        orderId: order._id,
        orderName: order.name,
        creatorId: order.creatorId,
        creatorFirstName: creator?.firstName ?? "",
        creatorLastName: creator?.lastName ?? "",
        creatorAvatarUrl: creator?.avatarUrl ?? null,
        amountOwed: Number(userOU.amountOwed),
      });
    }

    return payments.sort((a, b) => b.amountOwed - a.amountOwed);
  },
});

// Get completed order details for the completed order detail screen
export const getCompletedOrderDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    if (order.status !== "completed") return null;

    // Get all order users
    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Verify user is part of this order
    const isParticipant = orderUsers.some((ou) => ou.userId === userId);
    if (!isParticipant) return null;

    const isCreator = order.creatorId === userId;

    // Get order locations with names
    const orderLocations = await ctx.db
      .query("orderLocations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const locations = await Promise.all(
      orderLocations.map(async (ol) => {
        const location = await ctx.db.get(ol.locationId);
        return {
          id: ol._id,
          name: location?.name ?? "Unknown",
        };
      })
    );

    // Enrich each participant with profile, items, and settlement info
    let totalItems = 0;
    let totalAmount = 0n;

    const participants = await Promise.all(
      orderUsers.map(async (ou) => {
        const user = await ctx.db.get(ou.userId);

        // Get all items for this order user
        const userItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderUserId", (q) => q.eq("orderUserId", ou._id))
          .collect();

        // Enrich items with item names
        const items = await Promise.all(
          userItems.map(async (oi) => {
            const item = await ctx.db.get(oi.itemId);
            return {
              name: item?.name ?? "Unknown Item",
              quantity: oi.quantity,
              comments: oi.comments,
              priceInCents: oi.priceInCents ? Number(oi.priceInCents) : null,
            };
          })
        );

        const itemCount = userItems.reduce((sum, item) => sum + item.quantity, 0);
        totalItems += itemCount;
        totalAmount += ou.amountOwed;

        return {
          orderUserId: ou._id,
          userId: ou.userId,
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
          avatarUrl: user?.avatarUrl ?? null,
          isCreator: ou.userId === order.creatorId,
          items,
          itemCount,
          amountOwed: Number(ou.amountOwed),
          settlementStatus: ou.settlementStatus,
        };
      })
    );

    // Sort: creator first, then alphabetically
    participants.sort((a, b) => {
      if (a.isCreator) return -1;
      if (b.isCreator) return 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    const callerOrderUser = orderUsers.find((ou) => ou.userId === userId);

    return {
      order: {
        id: order._id,
        name: order.name,
        createdAt: order._creationTime,
        status: order.status,
      },
      isCreator,
      locations,
      participants,
      callerAmountOwed: Number(callerOrderUser?.amountOwed ?? 0),
      stats: {
        totalItems,
        totalAmount: Number(totalAmount),
        participantCount: orderUsers.length,
      },
    };
  },
});

// Get squads - groups of people who have ordered together multiple times
export const getFrequentGroups = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return { squads: [] };

    const limit = args.limit ?? 3;

    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // For each order, collect co-orderer userIds and track the order
    const groupOccurrences = new Map<string, { count: number; orderIds: Id<"orders">[] }>();

    for (const userOU of userOrderUsers) {
      const orderUsers = await ctx.db
        .query("orderUsers")
        .withIndex("by_orderId", (q) => q.eq("orderId", userOU.orderId))
        .collect();

      const coOrdererIds = orderUsers
        .map((ou) => ou.userId as string)
        .filter((uid) => uid !== userId)
        .sort();

      // Skip orders with fewer than 2 co-orderers (need 3+ people total including current user)
      if (coOrdererIds.length < 2) continue;

      const fingerprint = coOrdererIds.join(",");
      const existing = groupOccurrences.get(fingerprint);
      if (existing) {
        existing.count++;
        existing.orderIds.push(userOU.orderId);
      } else {
        groupOccurrences.set(fingerprint, { count: 1, orderIds: [userOU.orderId] });
      }
    }

    // Filter to groups that appear 2+ times, sort by frequency
    const topGroups = [...groupOccurrences.entries()]
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);

    // Enrich each group with member profiles and most recent order info
    const squads = await Promise.all(
      topGroups.map(async ([fingerprint, data]) => {
        const memberIds = fingerprint.split(",");

        const members = (
          await Promise.all(
            memberIds.map(async (uid) => {
              const user = await ctx.db.get(uid as Id<"users">);
              return user
                ? {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatarUrl: user.avatarUrl,
                  }
                : null;
            })
          )
        ).filter((m) => m !== null);

        // Get most recent order for context
        let lastOrderName = "";
        let locationNames: string[] = [];

        // Find the most recent order by fetching them and sorting by creation time
        const orders = (
          await Promise.all(data.orderIds.map((id) => ctx.db.get(id)))
        ).filter((o) => o !== null);
        orders.sort((a, b) => b._creationTime - a._creationTime);

        if (orders.length > 0) {
          const mostRecent = orders[0];
          lastOrderName = mostRecent.name ?? "";
          const orderLocs = await ctx.db
            .query("orderLocations")
            .withIndex("by_orderId", (q) => q.eq("orderId", mostRecent._id))
            .collect();
          locationNames = (
            await Promise.all(
              orderLocs.map(async (ol) => {
                const loc = await ctx.db.get(ol.locationId);
                return loc?.name ?? null;
              })
            )
          ).filter((n) => n !== null);
        }

        return {
          id: fingerprint,
          members,
          orderCount: data.count,
          lastOrderName,
          locationNames,
          memberIds: fingerprint,
        };
      })
    );

    return { squads };
  },
});
