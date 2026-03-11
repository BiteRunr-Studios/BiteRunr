import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Enum validators
export const orderStatusValidator = v.union(
    v.literal("created"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("cancelled"),
);

export const orderUserStatusValidator = v.union(
    v.literal("ordering"),
    v.literal("done"),
);

export const settlementStatusValidator = v.union(
    v.literal("unpaid"),
    v.literal("claimed"),
    v.literal("confirmed"),
    v.literal("settled_in_person"),
);

export const stripePaymentStatusValidator = v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("expired"),
);

export default defineSchema({
    // Users table - managed by Better Auth component but we define the schema for our code
    // Better Auth adds the core fields, we add our custom fields
    users: defineTable({
        email: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        avatarUrl: v.optional(v.string()),
        avatarStorageId: v.optional(v.id("_storage")),
        stripeCustomerId: v.optional(v.string()),
    })
        .index("email", ["email"])
        .searchIndex("search_name", { searchField: "firstName" })
        .searchIndex("search_lastName", { searchField: "lastName" })
        .searchIndex("search_email", { searchField: "email" }),

    // Friends relationship
    friends: defineTable({
        userId: v.id("users"),
        friendId: v.id("users"),
    })
        .index("by_userId", ["userId"])
        .index("by_friendId", ["friendId"])
        .index("by_userId_friendId", ["userId", "friendId"]),

    // Friend requests (pending only - rows are deleted on accept/decline)
    friendRequests: defineTable({
        senderId: v.id("users"),
        receiverId: v.id("users"),
    })
        .index("by_senderId", ["senderId"])
        .index("by_receiverId", ["receiverId"])
        .index("by_senderId_receiverId", ["senderId", "receiverId"]),

    // Locations (restaurants, etc.)
    locations: defineTable({
        name: v.string(),
    }).index("by_name", ["name"]),

    // Menu items at locations
    items: defineTable({
        name: v.string(),
        locationId: v.id("locations"),
    })
        .index("by_locationId", ["locationId"])
        .index("by_name_locationId", ["name", "locationId"])
        .searchIndex("search_name", {
            searchField: "name",
            filterFields: ["locationId"],
        }),

    // Orders
    orders: defineTable({
        name: v.string(),
        creatorId: v.id("users"),
        comments: v.optional(v.string()),
        status: orderStatusValidator,
        paused: v.boolean(),
    })
        .index("by_creatorId", ["creatorId"])
        .index("by_status", ["status"])
        .index("by_creatorId_status", ["creatorId", "status"]),

    // Order users (participants in an order)
    orderUsers: defineTable({
        userId: v.id("users"),
        orderId: v.id("orders"),
        status: orderUserStatusValidator,
        settlementStatus: settlementStatusValidator,
        amountOwed: v.int64(),
    })
        .index("by_userId", ["userId"])
        .index("by_orderId", ["orderId"])
        .index("by_userId_orderId", ["userId", "orderId"])
        .index("by_orderId_settlementStatus", ["orderId", "settlementStatus"]),

    // Order locations (which locations are part of an order)
    orderLocations: defineTable({
        orderId: v.id("orders"),
        locationId: v.id("locations"),
        receiptTotalInCents: v.optional(v.int64()), // Receipt total including tax (set from receipt scanning)
    })
        .index("by_orderId", ["orderId"])
        .index("by_locationId", ["locationId"]),

    // Order items (individual items ordered by users)
    orderItems: defineTable({
        orderLocationId: v.id("orderLocations"),
        orderUserId: v.id("orderUsers"),
        itemId: v.id("items"),
        comments: v.optional(v.string()),
        quantity: v.number(),
        priceInCents: v.optional(v.int64()), // Price per item in cents (set from receipt scanning)
    })
        .index("by_orderLocationId", ["orderLocationId"])
        .index("by_orderUserId", ["orderUserId"])
        .index("by_itemId", ["itemId"])
        .index("by_orderUserId_itemId_comments", [
            "orderUserId",
            "itemId",
            "comments",
        ]),

    // Stripe Connect accounts (runners who receive card payments)
    connectedAccounts: defineTable({
        userId: v.id("users"),
        stripeAccountId: v.string(),
        onboardingComplete: v.boolean(),
        payoutsEnabled: v.boolean(),
        chargesEnabled: v.boolean(),
        email: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_stripeAccountId", ["stripeAccountId"]),

    // Stripe payments (member → runner via Stripe Connect)
    stripePayments: defineTable({
        buyerId: v.id("users"),
        sellerId: v.id("users"),
        orderId: v.id("orders"),
        orderUserId: v.id("orderUsers"),
        stripeSessionId: v.optional(v.string()),
        stripePaymentIntentId: v.optional(v.string()),
        amount: v.number(),
        platformFee: v.number(),
        currency: v.string(),
        description: v.string(),
        status: stripePaymentStatusValidator,
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_buyerId", ["buyerId"])
        .index("by_sellerId", ["sellerId"])
        .index("by_stripeSessionId", ["stripeSessionId"])
        .index("by_orderUserId", ["orderUserId"])
        .index("by_status", ["status"])
        .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),

    // Device push token ownership (tracks which user owns which device token)
    devicePushTokens: defineTable({
        pushToken: v.string(),
        userId: v.id("users"),
    })
        .index("by_pushToken", ["pushToken"])
        .index("by_userId", ["userId"]),

    // Order invites (QR code-based group joining)
    orderInvites: defineTable({
        orderId: v.id("orders"),
        code: v.string(), // 8-char alphanumeric code
        createdBy: v.id("users"),
        expiresAt: v.number(), // Timestamp when invite expires
        usageCount: v.number(), // Number of times this invite has been used
        maxUses: v.optional(v.number()), // Optional limit on uses (null = unlimited)
        isActive: v.boolean(), // Can be deactivated by creator
    })
        .index("by_code", ["code"])
        .index("by_orderId", ["orderId"])
        .index("by_orderId_isActive", ["orderId", "isActive"]),

    // Waitlist signups
    waitlist: defineTable({
        email: v.string(),
        signedUpAt: v.number(),
    }).index("by_email", ["email"]),
});
