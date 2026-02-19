import { v } from "convex/values";
import { mutation, action, internalMutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getUserId } from "./authHelper";
import { receiptParserAgent } from "./receiptAgent";
import { Id } from "./_generated/dataModel";

// Parsed receipt item structure
export const parsedReceiptItemValidator = v.object({
    name: v.string(),
    quantity: v.number(),
    priceInCents: v.union(v.number(), v.null()),
});

// Match structure for confirmation
export const receiptMatchValidator = v.object({
    receiptItem: parsedReceiptItemValidator,
    matchedOrderItemId: v.union(v.id("orderItems"), v.null()),
    matchedItemName: v.union(v.string(), v.null()),
    confidence: v.number(), // 0-1 fuzzy match confidence
    priceInCents: v.union(v.number(), v.null()),
});

// Generate upload URL for receipt images
export const generateReceiptUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        return await ctx.storage.generateUploadUrl();
    },
});

// Get order items for a specific location (for matching)
export const getOrderItemsForLocation = query({
    args: {
        orderLocationId: v.id("orderLocations"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) return null;

        // Get the order location to verify access
        const orderLocation = await ctx.db.get(args.orderLocationId);
        if (!orderLocation) return null;

        // Verify user is the order creator
        const order = await ctx.db.get(orderLocation.orderId);
        if (!order || order.creatorId !== userId) {
            return null;
        }

        // Get all order items for this location
        const orderItems = await ctx.db
            .query("orderItems")
            .withIndex("by_orderLocationId", (q) =>
                q.eq("orderLocationId", args.orderLocationId),
            )
            .collect();

        // Enrich with item details and user info
        const enrichedItems = await Promise.all(
            orderItems.map(async (oi) => {
                const item = await ctx.db.get(oi.itemId);
                const orderUser = await ctx.db.get(oi.orderUserId);
                const user = orderUser
                    ? await ctx.db.get(orderUser.userId)
                    : null;

                return {
                    id: oi._id,
                    itemName: item?.name ?? "Unknown Item",
                    quantity: oi.quantity,
                    comments: oi.comments,
                    priceInCents: oi.priceInCents
                        ? Number(oi.priceInCents)
                        : null,
                    userName: user
                        ? `${user.firstName} ${user.lastName}`
                        : "Unknown User",
                    orderUserId: oi.orderUserId,
                };
            }),
        );

        return enrichedItems;
    },
});

// Parse receipt image using AI agent
export const parseReceipt = action({
    args: {
        storageId: v.id("_storage"),
        orderLocationId: v.id("orderLocations"),
    },
    handler: async (
        ctx,
        args,
    ): Promise<{
        success: boolean;
        items?: Array<{
            name: string;
            quantity: number;
            priceInCents: number | null;
        }>;
        storeName?: string;
        date?: string;
        totalInCents?: number;
        error?: string;
    }> => {
        // Verify authentication and authorization by checking access to the order location
        const orderItems = await ctx.runQuery(
            api.receiptScanning.getOrderItemsForLocation,
            {
                orderLocationId: args.orderLocationId,
            },
        );
        if (orderItems === null) {
            return {
                success: false,
                error: "You don't have permission to scan receipts for this order.",
            };
        }

        // Get the image URL from storage
        const imageUrl = await ctx.storage.getUrl(args.storageId);
        if (!imageUrl) {
            await ctx.storage.delete(args.storageId);
            return { success: false, error: "We couldn't process your photo. Please try taking or selecting the image again." };
        }

        try {
            // Create a thread and send the image to the agent
            const { thread } = await receiptParserAgent.createThread(ctx, {});

            // Type assertion needed due to complex generic inference in Agent class
            const generateTextArgs = {
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Please parse this receipt and extract all items with their quantities and prices. Return the result as JSON.",
                            },
                            {
                                type: "image",
                                image: new URL(imageUrl),
                            },
                        ],
                    },
                ],
            } as unknown;
            const result = await thread.generateText(generateTextArgs as never);

            // Parse the JSON from the response
            const responseText = result.text;

            // Extract JSON from the response (it might be wrapped in markdown code blocks)
            let jsonStr = responseText;
            const jsonMatch = responseText.match(
                /```(?:json)?\s*([\s\S]*?)```/,
            );
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            let parsed;
            try {
                parsed = JSON.parse(jsonStr);
            } catch {
                return {
                    success: false,
                    error: "We couldn't read this image. Please make sure you're scanning a clear photo of a receipt.",
                };
            }

            // Handle AI-detected issues with the image
            if (parsed.error === "not_a_receipt") {
                return {
                    success: false,
                    error: "This doesn't look like a receipt. Please take or select a photo of your receipt and try again.",
                };
            }

            if (parsed.error === "unreadable_receipt") {
                return {
                    success: false,
                    error: "The receipt is too blurry or dark to read. Please take a clearer photo and try again.",
                };
            }

            if (!parsed.items || parsed.items.length === 0) {
                return {
                    success: false,
                    error: "No items found on the receipt. Please make sure the full receipt is visible in the photo.",
                };
            }

            return {
                success: true,
                items: parsed.items,
                storeName: parsed.storeName,
                date: parsed.date,
                totalInCents: parsed.totalInCents,
            };
        } catch (error) {
            console.error("Error parsing receipt:", error);

            // Provide user-friendly messages for common errors
            const message = error instanceof Error ? error.message : "";

            if (message.includes("fetch") || message.includes("network") || message.includes("ECONNREFUSED")) {
                return {
                    success: false,
                    error: "We're having trouble connecting right now. Please check your internet connection and try again.",
                };
            }

            return {
                success: false,
                error: "Something went wrong while scanning your receipt. Please try again.",
            };
        } finally {
            // Always delete the receipt image from storage after processing.
            // We only need the extracted data, not the photo itself.
            try {
                await ctx.storage.delete(args.storageId);
            } catch {
                // Storage cleanup is best-effort; don't fail the request if it errors
            }
        }
    },
});

// Confirm receipt matches and save prices
export const confirmReceiptMatches = mutation({
    args: {
        matches: v.array(
            v.object({
                orderItemId: v.id("orderItems"),
                priceInCents: v.number(),
            }),
        ),
        orderId: v.id("orders"),
        orderLocationId: v.id("orderLocations"),
        receiptTotalInCents: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Verify user is the order creator
        const order = await ctx.db.get(args.orderId);
        if (!order || order.creatorId !== userId) {
            throw new Error("Not authorized");
        }

        // Verify orderLocationId belongs to this order
        const orderLocation = await ctx.db.get(args.orderLocationId);
        if (!orderLocation || orderLocation.orderId !== args.orderId) {
            throw new Error("Invalid order location");
        }

        // Update each matched order item with its price
        for (const match of args.matches) {
            await ctx.db.patch(match.orderItemId, {
                priceInCents: BigInt(match.priceInCents),
            });
        }

        // Save the receipt total to the order location (includes tax)
        if (args.receiptTotalInCents !== undefined) {
            await ctx.db.patch(args.orderLocationId, {
                receiptTotalInCents: BigInt(args.receiptTotalInCents),
            });
        }

        // Recalculate amounts owed for all users in this order
        await ctx.scheduler.runAfter(
            0,
            internal.receiptScanning.recalculateAmountsOwed,
            {
                orderId: args.orderId,
            },
        );

        return { success: true, updatedCount: args.matches.length };
    },
});

// Internal mutation to recalculate amounts owed
export const recalculateAmountsOwed = internalMutation({
    args: {
        orderId: v.id("orders"),
    },
    handler: async (ctx, args) => {
        // Get all order users
        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        // Calculate total owed for each user
        for (const orderUser of orderUsers) {
            // Get all items for this user
            const userItems = await ctx.db
                .query("orderItems")
                .withIndex("by_orderUserId", (q) =>
                    q.eq("orderUserId", orderUser._id),
                )
                .collect();

            // Sum up the prices (quantity * priceInCents)
            let totalOwed = BigInt(0);
            for (const item of userItems) {
                if (item.priceInCents) {
                    // priceInCents is per item, multiply by quantity
                    totalOwed += BigInt(item.quantity) * item.priceInCents;
                }
            }

            // Update the user's amountOwed
            await ctx.db.patch(orderUser._id, {
                amountOwed: totalOwed,
            });
        }

        return { success: true };
    },
});

// Clear all prices for a location (reset)
export const clearLocationPrices = mutation({
    args: {
        orderLocationId: v.id("orderLocations"),
    },
    handler: async (ctx, args) => {
        const userId = await getUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Get the order location
        const orderLocation = await ctx.db.get(args.orderLocationId);
        if (!orderLocation) throw new Error("Order location not found");

        // Verify user is the order creator
        const order = await ctx.db.get(orderLocation.orderId);
        if (!order || order.creatorId !== userId) {
            throw new Error("Not authorized");
        }

        // Get all order items for this location
        const orderItems = await ctx.db
            .query("orderItems")
            .withIndex("by_orderLocationId", (q) =>
                q.eq("orderLocationId", args.orderLocationId),
            )
            .collect();

        // Clear prices
        for (const item of orderItems) {
            await ctx.db.patch(item._id, {
                priceInCents: undefined,
            });
        }

        // Recalculate amounts owed
        await ctx.scheduler.runAfter(
            0,
            internal.receiptScanning.recalculateAmountsOwed,
            {
                orderId: orderLocation.orderId,
            },
        );

        return { success: true };
    },
});
