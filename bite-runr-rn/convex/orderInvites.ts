import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getUserId, requireUserIdWithSync } from "./authHelper";

// Generate a random 8-character alphanumeric code
function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar looking chars (0, O, 1, I)
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Default expiry time: 24 hours
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Create an invite code for an order (creator only)
export const createInvite = mutation({
    args: {
        orderId: v.id("orders"),
        expiryHours: v.optional(v.number()), // Custom expiry time in hours
        maxUses: v.optional(v.number()), // Optional limit on uses
    },
    handler: async (ctx, args) => {
        const userId = await requireUserIdWithSync(ctx);

        // Get the order and verify creator
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");
        if (order.creatorId !== userId) {
            throw new Error("Only the order creator can create invites");
        }

        // Check order status - can't invite to completed/cancelled orders
        if (order.status === "completed" || order.status === "cancelled") {
            throw new Error("Cannot create invites for completed or cancelled orders");
        }

        // Check if order is paused
        if (order.paused) {
            throw new Error("Cannot create invites for paused orders");
        }

        // Deactivate any existing active invites for this order
        const existingInvites = await ctx.db
            .query("orderInvites")
            .withIndex("by_orderId_isActive", (q) =>
                q.eq("orderId", args.orderId).eq("isActive", true)
            )
            .collect();

        for (const invite of existingInvites) {
            await ctx.db.patch(invite._id, { isActive: false });
        }

        // Generate a unique code
        let code = generateInviteCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await ctx.db
                .query("orderInvites")
                .withIndex("by_code", (q) => q.eq("code", code))
                .first();
            if (!existing) break;
            code = generateInviteCode();
            attempts++;
        }

        if (attempts >= 10) {
            throw new Error("Failed to generate unique invite code");
        }

        // Calculate expiry time
        const expiryMs = args.expiryHours
            ? args.expiryHours * 60 * 60 * 1000
            : DEFAULT_EXPIRY_MS;
        const expiresAt = Date.now() + expiryMs;

        // Create the invite
        const inviteId = await ctx.db.insert("orderInvites", {
            orderId: args.orderId,
            code,
            createdBy: userId,
            expiresAt,
            usageCount: 0,
            maxUses: args.maxUses,
            isActive: true,
        });

        return { inviteId, code };
    },
});

// Get the current active invite for an order (if any)
export const getActiveInvite = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        // Verify user is part of this order
        const orderUser = await ctx.db
            .query("orderUsers")
            .withIndex("by_userId_orderId", (q) =>
                q.eq("userId", userId).eq("orderId", args.orderId)
            )
            .first();

        if (!orderUser) return null;

        // Get active invite
        const invite = await ctx.db
            .query("orderInvites")
            .withIndex("by_orderId_isActive", (q) =>
                q.eq("orderId", args.orderId).eq("isActive", true)
            )
            .first();

        if (!invite) return null;

        // Check if expired
        if (invite.expiresAt < Date.now()) {
            return null;
        }

        return {
            id: invite._id,
            code: invite.code,
            expiresAt: invite.expiresAt,
            usageCount: invite.usageCount,
            maxUses: invite.maxUses,
        };
    },
});

// Validate an invite code (for preview before joining)
export const validateInvite = query({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        // Normalize the code (uppercase, trim)
        const code = args.code.toUpperCase().trim();

        // Find the invite
        const invite = await ctx.db
            .query("orderInvites")
            .withIndex("by_code", (q) => q.eq("code", code))
            .first();

        if (!invite) {
            return { valid: false, error: "Invalid invite code" };
        }

        // Check if active
        if (!invite.isActive) {
            return { valid: false, error: "This invite is no longer active" };
        }

        // Check if expired
        if (invite.expiresAt < Date.now()) {
            return { valid: false, error: "This invite has expired" };
        }

        // Check max uses
        if (invite.maxUses !== undefined && invite.usageCount >= invite.maxUses) {
            return { valid: false, error: "This invite has reached its usage limit" };
        }

        // Get order details
        const order = await ctx.db.get(invite.orderId);
        if (!order) {
            return { valid: false, error: "Order not found" };
        }

        // Check order status
        if (order.status === "completed" || order.status === "cancelled") {
            return {
                valid: false,
                error: `This order has been ${order.status}`,
            };
        }

        if (order.paused) {
            return {
                valid: false,
                error: "This order is currently paused and not accepting new participants",
            };
        }

        // Get creator info
        const creator = await ctx.db.get(order.creatorId);

        // Get participant count
        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
            .collect();

        // Check if current user is already a participant
        const userId = await getUserId(ctx);
        const isAlreadyMember = userId
            ? orderUsers.some((ou) => ou.userId === userId)
            : false;

        return {
            valid: true,
            isAlreadyMember,
            order: {
                id: order._id,
                name: order.name,
                status: order.status,
                participantCount: orderUsers.length,
            },
            creator: creator
                ? {
                      firstName: creator.firstName,
                      lastName: creator.lastName,
                      avatarUrl: creator.avatarUrl,
                  }
                : null,
        };
    },
});

// Join an order via invite code
export const joinOrder = mutation({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const userId = await requireUserIdWithSync(ctx);

        // Normalize the code
        const code = args.code.toUpperCase().trim();

        // Find the invite
        const invite = await ctx.db
            .query("orderInvites")
            .withIndex("by_code", (q) => q.eq("code", code))
            .first();

        if (!invite) {
            throw new Error("Invalid invite code");
        }

        // Check if active
        if (!invite.isActive) {
            throw new Error("This invite is no longer active");
        }

        // Check if expired
        if (invite.expiresAt < Date.now()) {
            throw new Error("This invite has expired");
        }

        // Check max uses
        if (invite.maxUses !== undefined && invite.usageCount >= invite.maxUses) {
            throw new Error("This invite has reached its usage limit");
        }

        // Get the order
        const order = await ctx.db.get(invite.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        // Check order status
        if (order.status === "completed" || order.status === "cancelled") {
            throw new Error(`This order has been ${order.status}`);
        }

        if (order.paused) {
            throw new Error("This order is currently paused and not accepting new participants");
        }

        // Check if user is already a participant
        const existingOrderUser = await ctx.db
            .query("orderUsers")
            .withIndex("by_userId_orderId", (q) =>
                q.eq("userId", userId).eq("orderId", order._id)
            )
            .first();

        if (existingOrderUser) {
            // User is already in the order, just return the orderId
            return { orderId: order._id, alreadyMember: true };
        }

        // Add user to the order
        await ctx.db.insert("orderUsers", {
            userId,
            orderId: order._id,
            status: "ordering",
            settlementStatus: "unpaid",
            amountOwed: 0n,
        });

        // Increment usage count
        await ctx.db.patch(invite._id, {
            usageCount: invite.usageCount + 1,
        });

        // Send push notification to the order creator
        const joiningUser = await ctx.db.get(userId);
        const joinerName = joiningUser?.firstName || "Someone";

        await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
            userId: order.creatorId,
            title: "New Participant Joined",
            body: `${joinerName} joined your order "${order.name}"`,
            data: { type: "order_join", orderId: order._id },
        });

        return { orderId: order._id, alreadyMember: false };
    },
});

// Deactivate all active invites for an order (creator only)
export const deactivateInvite = mutation({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const userId = await requireUserIdWithSync(ctx);

        // Get the order and verify creator
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");
        if (order.creatorId !== userId) {
            throw new Error("Only the order creator can deactivate invites");
        }

        // Deactivate all active invites
        const activeInvites = await ctx.db
            .query("orderInvites")
            .withIndex("by_orderId_isActive", (q) =>
                q.eq("orderId", args.orderId).eq("isActive", true)
            )
            .collect();

        for (const invite of activeInvites) {
            await ctx.db.patch(invite._id, { isActive: false });
        }

        return { deactivatedCount: activeInvites.length };
    },
});
