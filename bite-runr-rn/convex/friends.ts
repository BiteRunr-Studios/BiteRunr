import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getUserId } from "./authHelper";

// List all friends for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
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
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiverId", (q) => q.eq("receiverId", userId))
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
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.receiverId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if request already exists (sender -> receiver)
    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId_receiverId", (q) =>
        q.eq("senderId", userId).eq("receiverId", args.receiverId)
      )
      .first();

    if (existingRequest) {
      throw new Error("Friend request already sent");
    }

    // Check if reverse request exists (receiver -> sender)
    // If so, auto-accept since both users want to be friends
    const reverseRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId_receiverId", (q) =>
        q.eq("senderId", args.receiverId).eq("receiverId", userId)
      )
      .first();

    if (reverseRequest) {
      // Auto-accept: delete the request and create friendship
      await ctx.db.delete(reverseRequest._id);

      // Create bidirectional friendship
      await ctx.db.insert("friends", {
        userId: reverseRequest.senderId,
        friendId: reverseRequest.receiverId,
      });
      await ctx.db.insert("friends", {
        userId: reverseRequest.receiverId,
        friendId: reverseRequest.senderId,
      });

      return reverseRequest._id;
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

    const requestId = await ctx.db.insert("friendRequests", {
      senderId: userId,
      receiverId: args.receiverId,
    });

    // Send push notification to receiver
    const sender = await ctx.db.get(userId);
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "Someone";

    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
      userId: args.receiverId,
      title: "New Friend Request",
      body: `${senderName} requested to friend you`,
      data: { type: "friend_request", senderId: userId },
    });

    return requestId;
  },
});

// Accept a friend request
export const acceptRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.receiverId !== userId) throw new Error("Not authorized");

    // Delete the request
    await ctx.db.delete(args.requestId);

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
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.receiverId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.requestId);
    return true;
  },
});

// Search users by name or email (excludes current user, existing friends, and pending requests)
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const searchQuery = args.query.trim();
    if (searchQuery.length < 2) return [];

    // Use search indexes to find matching users (scalable approach)
    const [firstNameResults, lastNameResults, emailResults] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("search_name", (q) => q.search("firstName", searchQuery))
        .take(50),
      ctx.db
        .query("users")
        .withSearchIndex("search_lastName", (q) => q.search("lastName", searchQuery))
        .take(50),
      ctx.db
        .query("users")
        .withSearchIndex("search_email", (q) => q.search("email", searchQuery))
        .take(50),
    ]);

    // Merge and deduplicate results
    const userMap = new Map<string, (typeof firstNameResults)[0]>();
    for (const user of [...firstNameResults, ...lastNameResults, ...emailResults]) {
      userMap.set(user._id, user);
    }
    const candidateUsers = Array.from(userMap.values());

    // Get current user's friends
    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const friendIds = new Set(friendships.map((f) => f.friendId));

    // Get pending requests (both sent and received)
    const [sentRequests, receivedRequests] = await Promise.all([
      ctx.db
        .query("friendRequests")
        .withIndex("by_senderId", (q) => q.eq("senderId", userId))
        .collect(),
      ctx.db
        .query("friendRequests")
        .withIndex("by_receiverId", (q) => q.eq("receiverId", userId))
        .collect(),
    ]);

    const pendingUserIds = new Set([
      ...sentRequests.map((r) => r.receiverId),
      ...receivedRequests.map((r) => r.senderId),
    ]);

    // Filter out self, friends, and pending requests
    const results = candidateUsers
      .filter((user) => {
        // Exclude self
        if (user._id === userId) return false;
        // Exclude existing friends
        if (friendIds.has(user._id)) return false;
        // Exclude users with pending requests
        if (pendingUserIds.has(user._id)) return false;
        return true;
      })
      .slice(0, 20); // Limit final results

    return results.map((user) => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }));
  },
});

// Remove a friend (unfriend)
export const removeFriend = mutation({
  args: { friendId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find and delete both friendship records (bidirectional)
    const friendship1 = await ctx.db
      .query("friends")
      .withIndex("by_userId_friendId", (q) =>
        q.eq("userId", userId).eq("friendId", args.friendId)
      )
      .first();

    const friendship2 = await ctx.db
      .query("friends")
      .withIndex("by_userId_friendId", (q) =>
        q.eq("userId", args.friendId).eq("friendId", userId)
      )
      .first();

    if (friendship1) await ctx.db.delete(friendship1._id);
    if (friendship2) await ctx.db.delete(friendship2._id);

    // Also delete any friend request records between these users
    const friendRequest1 = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId_receiverId", (q) =>
        q.eq("senderId", userId).eq("receiverId", args.friendId)
      )
      .first();

    const friendRequest2 = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId_receiverId", (q) =>
        q.eq("senderId", args.friendId).eq("receiverId", userId)
      )
      .first();

    if (friendRequest1) await ctx.db.delete(friendRequest1._id);
    if (friendRequest2) await ctx.db.delete(friendRequest2._id);

    return true;
  },
});

// Get count of pending friend requests
export const pendingRequestCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return 0;

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiverId", (q) => q.eq("receiverId", userId))
      .collect();

    return requests.length;
  },
});
