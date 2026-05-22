import { v } from "convex/values";
import {
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getUserId } from "./authHelper";
import { pushNotifications } from "./pushNotifications";

async function getUnsettledBalances(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
) {
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

  return { owedToMe, iOwe };
}

export async function purgeAppUserByEmail(ctx: MutationCtx, email: string) {
  const appUser = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();

  if (!appUser) return;

  const userId = appUser._id;

  if (appUser.avatarStorageId) {
    try {
      await ctx.storage.delete(appUser.avatarStorageId);
    } catch {
      // Ignore missing files
    }
  }

  const friendshipsAsUser = await ctx.db
    .query("friends")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const friendship of friendshipsAsUser) {
    await ctx.db.delete(friendship._id);
  }

  const friendshipsAsFriend = await ctx.db
    .query("friends")
    .filter((q) => q.eq(q.field("friendId"), userId))
    .collect();
  for (const friendship of friendshipsAsFriend) {
    await ctx.db.delete(friendship._id);
  }

  const sentRequests = await ctx.db
    .query("friendRequests")
    .withIndex("by_senderId", (q) => q.eq("senderId", userId))
    .collect();
  for (const request of sentRequests) {
    await ctx.db.delete(request._id);
  }

  const receivedRequests = await ctx.db
    .query("friendRequests")
    .withIndex("by_receiverId", (q) => q.eq("receiverId", userId))
    .collect();
  for (const request of receivedRequests) {
    await ctx.db.delete(request._id);
  }

  try {
    await pushNotifications.removeToken(ctx, { userId });
  } catch {
    // Ignore if no token registered
  }

  const pushTokenRecords = await ctx.db
    .query("devicePushTokens")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const record of pushTokenRecords) {
    await ctx.db.delete(record._id);
  }

  const connectedAccount = await ctx.db
    .query("connectedAccounts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  if (connectedAccount) {
    await ctx.db.delete(connectedAccount._id);
  }

  const squadsAsCreator = await ctx.db
    .query("squads")
    .withIndex("by_creatorId", (q) => q.eq("creatorId", userId))
    .collect();
  for (const squad of squadsAsCreator) {
    await ctx.db.delete(squad._id);
  }

  const allSquads = await ctx.db.query("squads").collect();
  for (const squad of allSquads) {
    if (squad.creatorId === userId) continue;
    if (squad.memberIds.includes(userId)) {
      await ctx.db.patch(squad._id, {
        memberIds: squad.memberIds.filter((id) => id !== userId),
      });
    }
  }

  const invites = await ctx.db
    .query("orderInvites")
    .filter((q) => q.eq(q.field("createdBy"), userId))
    .collect();
  for (const invite of invites) {
    await ctx.db.delete(invite._id);
  }

  const orderUsers = await ctx.db
    .query("orderUsers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  for (const orderUser of orderUsers) {
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderUserId", (q) => q.eq("orderUserId", orderUser._id))
      .collect();
    for (const item of orderItems) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(orderUser._id);
  }

  await ctx.db.delete(userId);
}

export const canDeleteAccount = query({
  args: {},
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return { allowed: false, reason: "Not signed in" };
    }

    const { owedToMe, iOwe } = await getUnsettledBalances(ctx, userId);

    if (owedToMe > 0n || iOwe > 0n) {
      return {
        allowed: false,
        reason: "Settle outstanding payments before deleting your account.",
      };
    }

    return { allowed: true };
  },
});

export const deleteAppUserData = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await purgeAppUserByEmail(ctx, args.email);
    return null;
  },
});
