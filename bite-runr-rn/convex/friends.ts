import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// List all friends for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Get friend user details
    const friends = await Promise.all(
      friendships.map(async (f) => {
        const friend = await ctx.db.get(f.friendId);
        if (!friend) return null;
        return {
          id: friend._id,
          firstName: friend.firstName,
          lastName: friend.lastName,
          avatarUrl: friend.avatarUrl,
        };
      })
    );

    return friends.filter((f) => f !== null);
  },
});

// List pending friend requests received by current user
export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiverId_status", (q) =>
        q.eq("receiverId", userId).eq("status", "pending")
      )
      .collect();

    // Get sender details
    const requestsWithSender = await Promise.all(
      requests.map(async (r) => {
        const sender = await ctx.db.get(r.senderId);
        return {
          id: r._id,
          sender: sender
            ? {
                id: sender._id,
                firstName: sender.firstName,
                lastName: sender.lastName,
                avatarUrl: sender.avatarUrl,
              }
            : null,
          status: r.status,
          createdAt: r._creationTime,
        };
      })
    );

    return requestsWithSender.filter((r) => r.sender !== null);
  },
});

// Send a friend request
export const sendRequest = mutation({
  args: { receiverId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.receiverId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if request already exists
    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId_receiverId", (q) =>
        q.eq("senderId", userId).eq("receiverId", args.receiverId)
      )
      .first();

    if (existingRequest) {
      throw new Error("Friend request already sent");
    }

    // Check if already friends
    const existingFriendship = await ctx.db
      .query("friends")
      .withIndex("by_userId_friendId", (q) =>
        q.eq("userId", userId).eq("friendId", args.receiverId)
      )
      .first();

    if (existingFriendship) {
      throw new Error("Already friends");
    }

    return await ctx.db.insert("friendRequests", {
      senderId: userId,
      receiverId: args.receiverId,
      status: "pending",
    });
  },
});

// Accept a friend request
export const acceptRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.receiverId !== userId) throw new Error("Not authorized");
    if (request.status !== "pending") throw new Error("Request already processed");

    // Update request status
    await ctx.db.patch(args.requestId, { status: "accepted" });

    // Create bidirectional friendship
    await ctx.db.insert("friends", {
      userId: request.senderId,
      friendId: request.receiverId,
    });
    await ctx.db.insert("friends", {
      userId: request.receiverId,
      friendId: request.senderId,
    });

    return true;
  },
});

// Reject a friend request
export const rejectRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.receiverId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.requestId, { status: "rejected" });
    return true;
  },
});
