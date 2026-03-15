import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getUserId } from "./authHelper";
import { orderStatusValidator } from "./schema";

function buildUserName(firstName?: string, lastName?: string, email?: string) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email || "Unknown User";
}

function normalizeLocationNames(locationNames: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawName of locationNames) {
    const name = rawName.trim();
    if (!name) {
      continue;
    }

    const dedupeKey = name.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(name);
  }

  return normalized;
}

async function getOrderLocationsForOrder(
  ctx: any,
  orderId: Id<"orders">,
) {
  const orderLocations = await ctx.db
    .query("orderLocations")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .collect();

  return [...orderLocations].sort(
    (left, right) => left._creationTime - right._creationTime,
  );
}

async function countLinesForLocation(
  ctx: any,
  orderLocationId: Id<"orderLocations">,
) {
  const orderItems = await ctx.db
    .query("orderItems")
    .withIndex("by_orderLocationId", (q: any) =>
      q.eq("orderLocationId", orderLocationId),
    )
    .collect();

  return orderItems.length;
}

async function countLinesForOrder(
  ctx: any,
  orderId: Id<"orders">,
) {
  const orderLocations = await getOrderLocationsForOrder(ctx, orderId);
  let totalLines = 0;

  for (const orderLocation of orderLocations) {
    totalLines += await countLinesForLocation(ctx, orderLocation._id);
  }

  return totalLines;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const orders = await Promise.all(
      orderUsers.map(async (orderUser) => {
        const order = await ctx.db.get(orderUser.orderId);
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
      }),
    );

    return orders.filter((order) => order !== null);
  },
});

export const getWithDetails = query({
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

        const orderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        const enrichedOrderUsers = await Promise.all(
          orderUsers.map(async (orderUser) => {
            const user = await ctx.db.get(orderUser.userId);
            return {
              id: orderUser._id,
              userId: orderUser.userId,
              orderId: orderUser.orderId,
              status: orderUser.status,
              settlementStatus: orderUser.settlementStatus,
              amountOwed: orderUser.amountOwed,
              createdAt: orderUser._creationTime,
              user: user
                ? {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatarUrl: user.avatarUrl,
                  }
                : null,
            };
          }),
        );

        const orderLocations = await getOrderLocationsForOrder(ctx, order._id);
        const itemsCount = await countLinesForOrder(ctx, order._id);

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
          orderLocations: orderLocations.map((orderLocation) => ({
            id: orderLocation._id,
            name: orderLocation.name,
            createdAt: orderLocation._creationTime,
          })),
          itemsCount,
          peopleCount: orderUsers.length,
        };
      }),
    );

    return results
      .filter((result) => result !== null)
      .sort((left, right) => right.order.createdAt - left.order.createdAt);
  },
});

export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    if (!orderUsers.some((orderUser) => orderUser.userId === userId)) {
      return null;
    }

    const enrichedOrderUsers = await Promise.all(
      orderUsers.map(async (orderUser) => {
        const user = await ctx.db.get(orderUser.userId);
        const connectedAccount = await ctx.db
          .query("connectedAccounts")
          .withIndex("by_userId", (q) => q.eq("userId", orderUser.userId))
          .first();
        const userItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderUserId", (q) =>
            q.eq("orderUserId", orderUser._id),
          )
          .collect();

        return {
          id: orderUser._id,
          userId: orderUser.userId,
          orderId: orderUser.orderId,
          status: orderUser.status,
          amountOwed: orderUser.amountOwed,
          itemCount: userItems.length,
          isCreator: orderUser.userId === order.creatorId,
          hasStripePaymentsEnabled: connectedAccount?.chargesEnabled ?? false,
          createdAt: orderUser._creationTime,
          user: user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
              }
            : null,
        };
      }),
    );

    enrichedOrderUsers.sort((left, right) => {
      if (left.isCreator) return -1;
      if (right.isCreator) return 1;
      const leftName = `${left.user?.firstName || ""} ${left.user?.lastName || ""}`;
      const rightName = `${right.user?.firstName || ""} ${right.user?.lastName || ""}`;
      return leftName.localeCompare(rightName);
    });

    const orderLocations = await getOrderLocationsForOrder(ctx, args.orderId);
    const totalItems = await countLinesForOrder(ctx, args.orderId);
    const doneCount = orderUsers.filter((orderUser) => orderUser.status === "done").length;

    return {
      count: totalItems,
      orderUsers: enrichedOrderUsers,
      completionStats: {
        done: doneCount,
        total: orderUsers.length,
        allDone: doneCount === orderUsers.length,
      },
      order: {
        id: order._id,
        name: order.name,
        creatorId: order.creatorId,
        comments: order.comments,
        status: order.status,
        paused: order.paused,
        hasPausedAiSummary: Boolean(order.pausedAiSummary),
        createdAt: order._creationTime,
      },
      orderLocations: orderLocations.map((orderLocation) => ({
        id: orderLocation._id,
        orderId: orderLocation.orderId,
        name: orderLocation.name,
        createdAt: orderLocation._creationTime,
      })),
    };
  },
});

export const transferRunner = mutation({
  args: {
    orderId: v.id("orders"),
    newCreatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.creatorId !== userId) {
      throw new Error("Only the current runner can transfer this order");
    }
    if (order.status !== "active" && order.status !== "created") {
      throw new Error("Only active orders can be transferred");
    }
    if (order.paused) {
      throw new Error("Transfer the runner before the run starts");
    }
    if (args.newCreatorId === order.creatorId) {
      throw new Error("This person is already the runner");
    }

    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const nextRunner = orderUsers.find(
      (orderUser) => orderUser.userId === args.newCreatorId,
    );
    if (!nextRunner) {
      throw new Error("The new runner must already be part of this order");
    }

    await ctx.db.patch(args.orderId, { creatorId: args.newCreatorId });

    const previousRunner = await ctx.db.get(userId);
    const nextRunnerUser = await ctx.db.get(args.newCreatorId);
    const nextRunnerName = buildUserName(
      nextRunnerUser?.firstName,
      nextRunnerUser?.lastName,
      nextRunnerUser?.email,
    );
    const previousRunnerName = buildUserName(
      previousRunner?.firstName,
      previousRunner?.lastName,
      previousRunner?.email,
    );

    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
      userId: args.newCreatorId,
      title: "You're the New Runner",
      body: `You are now the runner for ${order.name}.`,
      data: { type: "runner_transferred", orderId: args.orderId },
    });

    const otherParticipantIds = orderUsers
      .map((orderUser) => orderUser.userId)
      .filter(
        (participantId) =>
          participantId !== userId && participantId !== args.newCreatorId,
      );

    if (otherParticipantIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUsers, {
        userIds: otherParticipantIds,
        title: "Runner Updated",
        body: `${nextRunnerName} is now the runner for ${order.name}.`,
        data: { type: "runner_transferred", orderId: args.orderId },
      });
    }

    return {
      orderId: args.orderId,
      previousRunnerName,
      nextRunnerName,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    comments: v.optional(v.string()),
    locationNames: v.array(v.string()),
    friendIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const normalizedLocationNames = normalizeLocationNames(args.locationNames);
    if (normalizedLocationNames.length === 0) {
      throw new Error("At least one location is required");
    }

    const uniqueFriendIds = [...new Set(args.friendIds)];

    const orderId = await ctx.db.insert("orders", {
      name: args.name,
      creatorId: userId,
      comments: args.comments,
      status: "active",
      paused: false,
    });

    for (const locationName of normalizedLocationNames) {
      await ctx.db.insert("orderLocations", {
        orderId,
        name: locationName,
      });
    }

    await ctx.db.insert("orderUsers", {
      userId,
      orderId,
      status: "ordering",
      settlementStatus: "unpaid",
      amountOwed: 0n,
    });

    for (const friendId of uniqueFriendIds) {
      await ctx.db.insert("orderUsers", {
        userId: friendId,
        orderId,
        status: "ordering",
        settlementStatus: "unpaid",
        amountOwed: 0n,
      });
    }

    if (uniqueFriendIds.length > 0) {
      const creator = await ctx.db.get(userId);
      const creatorName = creator?.firstName || "Someone";

      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUsers, {
        userIds: uniqueFriendIds,
        title: "Group Order Started",
        body: `A group order started with ${creatorName}`,
        data: { type: "group_order", orderId },
      });
    }

    return orderId;
  },
});

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
    if (order.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.comments !== undefined) updates.comments = args.comments;
    if (args.status !== undefined) updates.status = args.status;
    if (args.paused !== undefined) updates.paused = args.paused;
    if (args.paused === false) updates.pausedAiSummary = undefined;

    await ctx.db.patch(args.orderId, updates);

    if (args.paused === true) {
      const creator = await ctx.db.get(userId);
      const creatorName = creator?.firstName || "Someone";
      const orderName = order.name || "the order";
      const orderUsers = await ctx.db
        .query("orderUsers")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .collect();
      const memberUserIds = orderUsers
        .map((orderUser) => orderUser.userId)
        .filter((memberId) => memberId !== userId);

      if (memberUserIds.length > 0) {
        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUsers, {
          userIds: memberUserIds,
          title: "Run Started!",
          body: `${creatorName} is heading out for ${orderName}`,
          data: { type: "run_started", orderId: args.orderId },
        });
      }
    }

    return args.orderId;
  },
});

export const cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.orderId, { status: "cancelled" });
    return true;
  },
});

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
        if (order.status !== "active" && order.status !== "created") {
          return null;
        }

        const orderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        const enrichedOrderUsers = await Promise.all(
          orderUsers.map(async (orderUser) => {
            const user = await ctx.db.get(orderUser.userId);
            return {
              id: orderUser._id,
              firstName: user?.firstName,
              lastName: user?.lastName,
              avatarUrl: user?.avatarUrl,
            };
          }),
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
      }),
    );

    return results
      .filter((result) => result !== null)
      .sort((left, right) => right.createdAt - left.createdAt);
  },
});

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
        if (!order || order.status !== "completed") return null;

        const orderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        const enrichedOrderUsers = await Promise.all(
          orderUsers.map(async (orderUser) => {
            const user = await ctx.db.get(orderUser.userId);
            return {
              id: orderUser._id,
              userId: orderUser.userId,
              firstName: user?.firstName,
              lastName: user?.lastName,
              avatarUrl: user?.avatarUrl,
            };
          }),
        );

        const orderLocations = await getOrderLocationsForOrder(ctx, order._id);
        const itemsCount = await countLinesForOrder(ctx, order._id);
        const userAmount =
          orderUsers.find((orderUser) => orderUser.userId === userId)?.amountOwed ??
          0n;

        return {
          id: order._id,
          name: order.name,
          comments: order.comments,
          status: order.status,
          paused: order.paused,
          createdAt: order._creationTime,
          creatorId: order.creatorId,
          orderUsers: enrichedOrderUsers,
          orderLocations: orderLocations.map((orderLocation) => ({
            id: orderLocation._id,
            name: orderLocation.name,
          })),
          itemsCount,
          userAmount,
        };
      }),
    );

    return results
      .filter((result) => result !== null)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, limit);
  },
});

export const getFrequentItems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 6;
    const userOrderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const lineCounts = new Map<
      string,
      {
        id: string;
        text: string;
        locationName: string;
        totalOrdered: number;
        lastOrderedAt: number;
      }
    >();

    for (const userOrderUser of userOrderUsers) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderUserId", (q) =>
          q.eq("orderUserId", userOrderUser._id),
        )
        .collect();

      for (const orderItem of orderItems) {
        const orderLocation = await ctx.db.get(orderItem.orderLocationId);
        const locationName = orderLocation?.name ?? "Unknown";
        const dedupeKey = `${locationName.toLowerCase()}::${orderItem.text.toLowerCase()}`;
        const existing = lineCounts.get(dedupeKey);

        if (existing) {
          existing.totalOrdered += 1;
          existing.lastOrderedAt = Math.max(
            existing.lastOrderedAt,
            orderItem._creationTime,
          );
        } else {
          lineCounts.set(dedupeKey, {
            id: orderItem._id,
            text: orderItem.text,
            locationName,
            totalOrdered: 1,
            lastOrderedAt: orderItem._creationTime,
          });
        }
      }
    }

    return [...lineCounts.values()]
      .sort((left, right) => right.totalOrdered - left.totalOrdered)
      .slice(0, limit)
      .map((line) => ({
        id: line.id,
        name: line.text,
        locationName: line.locationName,
        totalOrdered: line.totalOrdered,
        lastOrderedAt: line.lastOrderedAt,
      }));
  },
});

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

    for (const userOrderUser of userOrderUsers) {
      const order = await ctx.db.get(userOrderUser.orderId);
      if (!order || order.status === "cancelled") continue;

      if (order.creatorId === userId) {
        const allOrderUsers = await ctx.db
          .query("orderUsers")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        for (const orderUser of allOrderUsers) {
          if (orderUser.userId === userId) continue;
          if (
            orderUser.settlementStatus !== "confirmed" &&
            orderUser.settlementStatus !== "settled_in_person"
          ) {
            owedToMe += orderUser.amountOwed;
          }
        }
      } else if (
        userOrderUser.settlementStatus === "unpaid" ||
        userOrderUser.settlementStatus === "claimed"
      ) {
        iOwe += userOrderUser.amountOwed;
      }
    }

    return {
      owedToMe: Number(owedToMe),
      iOwe: Number(iOwe),
    };
  },
});

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

    for (const userOrderUser of userOrderUsers) {
      const order = await ctx.db.get(userOrderUser.orderId);
      if (!order || order.status === "cancelled" || order.creatorId !== userId) {
        continue;
      }

      const allOrderUsers = await ctx.db
        .query("orderUsers")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      for (const orderUser of allOrderUsers) {
        if (orderUser.userId === userId) continue;
        if (
          orderUser.settlementStatus === "confirmed" ||
          orderUser.settlementStatus === "settled_in_person"
        ) {
          continue;
        }
        if (orderUser.amountOwed <= 0n) continue;

        const user = await ctx.db.get(orderUser.userId);
        debts.push({
          orderId: order._id,
          orderName: order.name,
          userId: orderUser.userId,
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
          avatarUrl: user?.avatarUrl ?? null,
          amountOwed: Number(orderUser.amountOwed),
        });
      }
    }

    return debts.sort((left, right) => right.amountOwed - left.amountOwed);
  },
});

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

    for (const userOrderUser of userOrderUsers) {
      const order = await ctx.db.get(userOrderUser.orderId);
      if (!order || order.status === "cancelled" || order.creatorId === userId) {
        continue;
      }
      if (userOrderUser.amountOwed <= 0n) continue;
      if (
        userOrderUser.settlementStatus !== "unpaid" &&
        userOrderUser.settlementStatus !== "claimed"
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
        amountOwed: Number(userOrderUser.amountOwed),
      });
    }

    return payments.sort((left, right) => right.amountOwed - left.amountOwed);
  },
});

export const getCompletedOrderDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "completed") return null;

    const orderUsers = await ctx.db
      .query("orderUsers")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();
    if (!orderUsers.some((orderUser) => orderUser.userId === userId)) {
      return null;
    }

    const isCreator = order.creatorId === userId;
    const orderLocations = await getOrderLocationsForOrder(ctx, args.orderId);
    const locationById = new Map(
      orderLocations.map((orderLocation) => [orderLocation._id, orderLocation]),
    );

    let totalItems = 0;
    let totalAmount = 0n;

    const participants = await Promise.all(
      orderUsers.map(async (orderUser) => {
        const user = await ctx.db.get(orderUser.userId);
        const userItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderUserId", (q) =>
            q.eq("orderUserId", orderUser._id),
          )
          .collect();

        const items = [...userItems]
          .sort((left, right) => {
            const leftLocation =
              locationById.get(left.orderLocationId)?._creationTime ?? 0;
            const rightLocation =
              locationById.get(right.orderLocationId)?._creationTime ?? 0;
            return leftLocation - rightLocation || left.sortOrder - right.sortOrder;
          })
          .map((orderItem) => ({
            text: orderItem.text,
            locationName:
              locationById.get(orderItem.orderLocationId)?.name ?? "Unknown Location",
            priceInCents:
              orderItem.priceInCents !== undefined
                ? Number(orderItem.priceInCents)
                : null,
          }));

        totalItems += items.length;
        totalAmount += orderUser.amountOwed;

        return {
          orderUserId: orderUser._id,
          userId: orderUser.userId,
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
          avatarUrl: user?.avatarUrl ?? null,
          isCreator: orderUser.userId === order.creatorId,
          items,
          itemCount: items.length,
          amountOwed: Number(orderUser.amountOwed),
          settlementStatus: orderUser.settlementStatus,
        };
      }),
    );

    participants.sort((left, right) => {
      if (left.isCreator) return -1;
      if (right.isCreator) return 1;
      return `${left.firstName} ${left.lastName}`.localeCompare(
        `${right.firstName} ${right.lastName}`,
      );
    });

    const callerOrderUser = orderUsers.find((orderUser) => orderUser.userId === userId);

    return {
      order: {
        id: order._id,
        name: order.name,
        createdAt: order._creationTime,
        status: order.status,
      },
      isCreator,
      locations: orderLocations.map((orderLocation) => ({
        id: orderLocation._id,
        name: orderLocation.name,
      })),
      participants,
      callerAmountOwed: Number(callerOrderUser?.amountOwed ?? 0n),
      stats: {
        totalItems,
        totalAmount: Number(totalAmount),
        participantCount: orderUsers.length,
      },
    };
  },
});

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

    const groupOccurrences = new Map<
      string,
      { count: number; orderIds: Id<"orders">[] }
    >();

    for (const userOrderUser of userOrderUsers) {
      const orderUsers = await ctx.db
        .query("orderUsers")
        .withIndex("by_orderId", (q) => q.eq("orderId", userOrderUser.orderId))
        .collect();

      const coOrdererIds = orderUsers
        .map((orderUser) => orderUser.userId as string)
        .filter((participantId) => participantId !== userId)
        .sort();

      if (coOrdererIds.length < 2) continue;

      const fingerprint = coOrdererIds.join(",");
      const existing = groupOccurrences.get(fingerprint);
      if (existing) {
        existing.count += 1;
        existing.orderIds.push(userOrderUser.orderId);
      } else {
        groupOccurrences.set(fingerprint, {
          count: 1,
          orderIds: [userOrderUser.orderId],
        });
      }
    }

    const topGroups = [...groupOccurrences.entries()]
      .filter(([, data]) => data.count >= 2)
      .sort((left, right) => right[1].count - left[1].count)
      .slice(0, limit);

    const squads = await Promise.all(
      topGroups.map(async ([fingerprint, data]) => {
        const memberIds = fingerprint.split(",");
        const members = (
          await Promise.all(
            memberIds.map(async (memberId) => {
              const user = await ctx.db.get(memberId as Id<"users">);
              return user
                ? {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatarUrl: user.avatarUrl,
                  }
                : null;
            }),
          )
        ).filter((member) => member !== null);

        let lastOrderName = "";
        let locationNames: string[] = [];

        const orders = (
          await Promise.all(data.orderIds.map((orderId) => ctx.db.get(orderId)))
        ).filter((order) => order !== null);
        orders.sort((left, right) => right._creationTime - left._creationTime);

        if (orders.length > 0) {
          const mostRecent = orders[0];
          lastOrderName = mostRecent.name ?? "";
          const orderLocations = await getOrderLocationsForOrder(ctx, mostRecent._id);
          locationNames = orderLocations.map((orderLocation) => orderLocation.name);
        }

        return {
          id: fingerprint,
          members,
          orderCount: data.count,
          lastOrderName,
          locationNames,
          memberIds: fingerprint,
        };
      }),
    );

    return { squads };
  },
});
