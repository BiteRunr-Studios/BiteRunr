import { v } from "convex/values";
import { mutation, action, internalMutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getUserId } from "./authHelper";
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// Parsed receipt item structure
export const parsedReceiptItemValidator = v.object({
    name: v.string(),
    quantity: v.number(),
    priceInCents: v.union(v.number(), v.null()),
    comboName: v.optional(v.union(v.string(), v.null())),
    comboItems: v.optional(v.array(v.string())),
    comboTotalInCents: v.optional(v.union(v.number(), v.null())),
});

// Match structure for confirmation
export const receiptMatchValidator = v.object({
    receiptItem: parsedReceiptItemValidator,
    matchedOrderItemId: v.union(v.id("orderItems"), v.null()),
    matchedItemName: v.union(v.string(), v.null()),
    confidence: v.number(), // 0-1 fuzzy match confidence
    priceInCents: v.union(v.number(), v.null()),
});

const MAX_INCLUDED_ITEMS = 20;

const receiptLineSchema = z.object({
    name: z
        .string()
        .describe(
            "Clean, human-readable item name. Decode abbreviations and translate non-English names to English.",
        ),
    quantity: z
        .number()
        .int()
        .describe("Quantity purchased. Default to 1 if not shown."),
    priceInCents: z
        .number()
        .int()
        .nullable()
        .describe(
            "Unit price in cents for one purchased unit, not the extended line total. Example: if quantity is 2 and the receipt shows $10.00 total, return 500 cents per unit.",
        ),
    includedItems: z
        .array(
            z.object({
                name: z
                    .string()
                    .describe(
                        "Included item name inside a combo/meal/trio. Decode abbreviations and translate to English.",
                    ),
                quantity: z
                    .number()
                    .int()
                    .describe(
                        "How many of this included item come with one combo. Default to 1 if not shown.",
                    ),
            }),
        )
        .default([])
        .describe(
            `If this line is a combo/meal/trio header, list the included items here. Leave empty for standalone items. Return at most ${MAX_INCLUDED_ITEMS} included items.`,
        ),
});

type ParsedReceiptLine = z.infer<typeof receiptLineSchema>;

interface NormalizedReceiptItem {
    name: string;
    quantity: number;
    priceInCents: number | null;
    comboName?: string | null;
    comboItems?: string[];
    comboTotalInCents?: number | null;
}

// Zod schema for structured receipt parsing output
const receiptResponseSchema = z.object({
    status: z
        .enum(["success", "not_a_receipt", "unreadable_receipt"])
        .describe(
            "Set to 'not_a_receipt' if the image is not a receipt/invoice. Set to 'unreadable_receipt' if it's a receipt but too blurry/dark to read. Otherwise 'success'.",
        ),
    items: z.array(receiptLineSchema).describe("Empty array if status is not 'success'."),
    storeName: z
        .string()
        .nullable()
        .describe("Store name if visible on receipt."),
    date: z
        .string()
        .nullable()
        .describe("Date if visible, in YYYY-MM-DD format."),
    totalInCents: z
        .number()
        .int()
        .nullable()
        .describe("Receipt total in cents including tax, if visible."),
});

const RECEIPT_PARSER_SYSTEM_PROMPT = `You are a receipt parsing assistant. Extract item names, quantities, and prices from receipt images.

## Abbreviations & Short Codes
Receipts frequently use abbreviations and short codes. Decode these into full, readable item names:
- Restaurant codes: "CFA San" → "Chick-fil-A Sandwich", "QP w/C" → "Quarter Pounder with Cheese"
- Truncated names: "CHKN NUGGET" → "Chicken Nuggets", "FR FRY LG" → "Large French Fries"
- Size: SM=Small, MD/MED=Medium, LG=Large, XL=Extra Large
- Modifiers: W/=With, W/O=Without, ADD=Added, NO=Without, XTR=Extra, COMBO=Combo Meal
- Use context from the store name and other items to decode ambiguous abbreviations
- If the user provides expected order items, use those as strong hints for decoding

## Multi-Language Receipts
Receipts may be in any language. Read and parse in the original language, then translate item names to English.
Keep proper nouns and brand names as-is.

## Rules
- Skip taxes, totals, subtotals, discounts, tips — only extract purchased items
- Include modifiers/customizations with the item name
- Return priceInCents as the price for ONE purchased unit, not the full line total
- If a combo/meal/trio line has included items listed underneath, return ONE top-level item for the priced combo and put the included items in includedItems
- Do not duplicate combo children as separate top-level items unless they are clearly separately charged
- Handle partial or unclear text with reasonable assumptions
- Always return prices in CENTS as integers`;

function sanitizeQuantity(quantity: number): number {
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return 1;
    }
    return Math.max(1, Math.round(quantity));
}

function normalizeReceiptName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(
            /\b(combo|meal|trio|deal|bundle|includes|included|with|and|the)\b/g,
            " ",
        )
        .replace(/\s+/g, " ")
        .trim();
}

function looksLikeComboHeader(name: string): boolean {
    return /\b(combo|meal|trio|box|bundle|deal|pack)\b/i.test(name);
}

function namesLookSimilar(left: string, right: string): boolean {
    const normalizedLeft = normalizeReceiptName(left);
    const normalizedRight = normalizeReceiptName(right);

    if (!normalizedLeft || !normalizedRight) {
        return false;
    }

    if (normalizedLeft === normalizedRight) {
        return true;
    }

    if (
        normalizedLeft.includes(normalizedRight) ||
        normalizedRight.includes(normalizedLeft)
    ) {
        return true;
    }

    const leftWords = new Set(normalizedLeft.split(" "));
    const rightWords = normalizedRight.split(" ").filter(Boolean);
    const overlap = rightWords.filter((word) => leftWords.has(word)).length;
    const minWordCount = Math.min(leftWords.size, rightWords.length);

    return minWordCount > 0 && overlap >= minWordCount;
}

function allocatePerUnitPrices(
    comboUnitPriceInCents: number,
    componentQuantities: number[],
): number[] {
    if (componentQuantities.length === 0) {
        return [];
    }

    if (componentQuantities.length > MAX_INCLUDED_ITEMS) {
        const totalUnits = componentQuantities.reduce(
            (sum, qty) => sum + qty,
            0,
        );
        if (totalUnits <= 0) {
            return componentQuantities.map(() => comboUnitPriceInCents);
        }

        const baseUnitPrice = Math.floor(comboUnitPriceInCents / totalUnits);
        let remainingRemainder =
            comboUnitPriceInCents - baseUnitPrice * totalUnits;
        const roundedIndexes = new Set<number>();
        const componentsByQuantity = componentQuantities
            .map((quantity, index) => ({ index, quantity }))
            .sort(
                (left, right) =>
                    right.quantity - left.quantity || left.index - right.index,
            );

        for (const component of componentsByQuantity) {
            if (component.quantity <= remainingRemainder) {
                roundedIndexes.add(component.index);
                remainingRemainder -= component.quantity;
            }

            if (remainingRemainder === 0) {
                break;
            }
        }

        if (remainingRemainder > 0) {
            const closestComponent = componentsByQuantity
                .filter((component) => !roundedIndexes.has(component.index))
                .sort(
                    (left, right) =>
                        Math.abs(left.quantity - remainingRemainder) -
                            Math.abs(right.quantity - remainingRemainder) ||
                        right.quantity - left.quantity ||
                        left.index - right.index,
                )[0];
            if (closestComponent) {
                roundedIndexes.add(closestComponent.index);
            }
        }

        return componentQuantities.map((_, index) => {
            const shouldRoundUp = roundedIndexes.has(index);
            return baseUnitPrice + (shouldRoundUp ? 1 : 0);
        });
    }

    const totalUnits = componentQuantities.reduce((sum, qty) => sum + qty, 0);
    if (totalUnits <= 0) {
        return componentQuantities.map(() => comboUnitPriceInCents);
    }

    const baseUnitPrice = Math.floor(comboUnitPriceInCents / totalUnits);
    const remainder = comboUnitPriceInCents - baseUnitPrice * totalUnits;

    let bestMask = 0;
    let bestSum = 0;

    for (let mask = 0; mask < 1 << componentQuantities.length; mask++) {
        let currentSum = 0;
        for (let index = 0; index < componentQuantities.length; index++) {
            if (mask & (1 << index)) {
                currentSum += componentQuantities[index];
            }
        }

        const currentDistance = Math.abs(remainder - currentSum);
        const bestDistance = Math.abs(remainder - bestSum);
        if (
            currentDistance < bestDistance ||
            (currentDistance === bestDistance && currentSum > bestSum)
        ) {
            bestMask = mask;
            bestSum = currentSum;
            if (currentSum === remainder) {
                break;
            }
        }
    }

    return componentQuantities.map((_, index) => {
        const shouldRoundUp = (bestMask & (1 << index)) !== 0;
        return baseUnitPrice + (shouldRoundUp ? 1 : 0);
    });
}

function normalizeParsedReceiptItems(
    parsedItems: ParsedReceiptLine[],
): NormalizedReceiptItem[] {
    const normalizedItems: NormalizedReceiptItem[] = [];
    const skippedIndexes = new Set<number>();

    for (let index = 0; index < parsedItems.length; index++) {
        if (skippedIndexes.has(index)) {
            continue;
        }

        const item = parsedItems[index];
        const itemName = item.name.trim();
        const itemQuantity = sanitizeQuantity(item.quantity);
        let includedItems = (item.includedItems ?? [])
            .slice(0, MAX_INCLUDED_ITEMS)
            .map((includedItem) => ({
                name: includedItem.name.trim(),
                quantity: sanitizeQuantity(includedItem.quantity),
            }))
            .filter((includedItem) => includedItem.name.length > 0);

        if (
            includedItems.length === 0 &&
            item.priceInCents !== null &&
            looksLikeComboHeader(itemName)
        ) {
            const inferredIncludedItems: Array<{ name: string; quantity: number }> = [];
            for (
                let lookAheadIndex = index + 1;
                lookAheadIndex < parsedItems.length &&
                lookAheadIndex <= index + 6 &&
                inferredIncludedItems.length < 4;
                lookAheadIndex++
            ) {
                const candidate = parsedItems[lookAheadIndex];
                const candidateName = candidate.name.trim();
                if (!candidateName) {
                    continue;
                }

                const candidatePrice = candidate.priceInCents ?? 0;
                if (candidatePrice > 0) {
                    break;
                }

                inferredIncludedItems.push({
                    name: candidateName,
                    quantity: sanitizeQuantity(candidate.quantity),
                });
            }

            if (inferredIncludedItems.length >= 2) {
                includedItems = inferredIncludedItems;
            }
        }

        if (includedItems.length === 0) {
            normalizedItems.push({
                name: itemName,
                quantity: itemQuantity,
                priceInCents: item.priceInCents,
            });
            continue;
        }

        const remainingIncludedItems = includedItems.map((includedItem) => ({
            ...includedItem,
            remainingQuantity: includedItem.quantity,
        }));

        for (
            let lookAheadIndex = index + 1;
            lookAheadIndex < parsedItems.length && lookAheadIndex <= index + 6;
            lookAheadIndex++
        ) {
            if (remainingIncludedItems.every((includedItem) => includedItem.remainingQuantity <= 0)) {
                break;
            }

            const candidate = parsedItems[lookAheadIndex];
            const candidatePrice = candidate.priceInCents ?? 0;
            if (candidatePrice > 0) {
                continue;
            }

            const matchingIncludedItem = remainingIncludedItems.find(
                (includedItem) =>
                    includedItem.remainingQuantity > 0 &&
                    namesLookSimilar(candidate.name, includedItem.name),
            );

            if (!matchingIncludedItem) {
                continue;
            }

            skippedIndexes.add(lookAheadIndex);
            matchingIncludedItem.remainingQuantity -= sanitizeQuantity(
                candidate.quantity,
            );
        }

        const comboItems = includedItems.map((includedItem) => includedItem.name);
        const splitUnitPrices =
            item.priceInCents !== null
                ? allocatePerUnitPrices(
                      item.priceInCents,
                      includedItems.map((includedItem) => includedItem.quantity),
                  )
                : includedItems.map(() => null);

        includedItems.forEach((includedItem, includedIndex) => {
            normalizedItems.push({
                name: includedItem.name,
                quantity: includedItem.quantity * itemQuantity,
                priceInCents: splitUnitPrices[includedIndex],
                comboName: itemName,
                comboItems,
                comboTotalInCents: item.priceInCents,
            });
        });
    }

    return normalizedItems;
}

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
            comboName?: string | null;
            comboItems?: string[];
            comboTotalInCents?: number | null;
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
            return {
                success: false,
                error: "We couldn't process your photo. Please try taking or selecting the image again.",
            };
        }

        try {
            // Build context about expected order items to help decode abbreviations
            const itemContext =
                orderItems && orderItems.length > 0
                    ? `\n\nThe order is expected to contain these items (use these to help decode receipt abbreviations and short codes):\n${orderItems.map((oi) => `- ${oi.itemName} (qty: ${oi.quantity})`).join("\n")}`
                    : "";

            const openrouter = createOpenRouter();
            const result = await generateObject({
                model: openrouter.chat("qwen/qwen3.5-35b-a3b", {
                    provider: {
                        order: ["parasail/fp8", "alibaba"],
                        allow_fallbacks: true,
                    },
                }),
                schema: receiptResponseSchema,
                system: RECEIPT_PARSER_SYSTEM_PROMPT,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Parse this receipt and extract all items with their quantities and prices.${itemContext}`,
                            },
                            {
                                type: "image",
                                image: new URL(imageUrl),
                            },
                        ],
                    },
                ],
                providerOptions: {
                    openrouter: { reasoning: { exclude: true } },
                },
            });

            const parsed = result.object;

            if (parsed.status === "not_a_receipt") {
                return {
                    success: false,
                    error: "This doesn't look like a receipt. Please take or select a photo of your receipt and try again.",
                };
            }

            if (parsed.status === "unreadable_receipt") {
                return {
                    success: false,
                    error: "The receipt is too blurry or dark to read. Please take a clearer photo and try again.",
                };
            }

            if (parsed.items.length === 0) {
                return {
                    success: false,
                    error: "No items found on the receipt. Please make sure the full receipt is visible in the photo.",
                };
            }

            const normalizedItems = normalizeParsedReceiptItems(parsed.items);

            return {
                success: true,
                items: normalizedItems,
                storeName: parsed.storeName ?? undefined,
                date: parsed.date ?? undefined,
                totalInCents: parsed.totalInCents ?? undefined,
            };
        } catch (error) {
            console.error("Error parsing receipt:", error);

            // Provide user-friendly messages for common errors
            const message = error instanceof Error ? error.message : "";

            if (
                message.includes("fetch") ||
                message.includes("network") ||
                message.includes("ECONNREFUSED")
            ) {
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

        // Send "Pickup Complete" notification to members who ordered from this location
        const orderItems = await ctx.db
            .query("orderItems")
            .withIndex("by_orderLocationId", (q) =>
                q.eq("orderLocationId", args.orderLocationId),
            )
            .collect();

        const uniqueOrderUserIds = [
            ...new Set(orderItems.map((item) => item.orderUserId)),
        ];

        const orderUserDocs = await Promise.all(
            uniqueOrderUserIds.map((id) => ctx.db.get(id)),
        );

        const memberUserIds = orderUserDocs
            .filter((ou) => ou !== null && ou.userId !== userId)
            .map((ou) => ou!.userId);

        if (memberUserIds.length > 0) {
            const location = orderLocation.locationId
                ? await ctx.db.get(orderLocation.locationId)
                : null;
            const locationName = location ? location.name : "the restaurant";

            await ctx.scheduler.runAfter(
                0,
                internal.pushNotifications.sendToUsers,
                {
                    userIds: memberUserIds,
                    title: "Pickup Complete!",
                    body: `Your items from ${locationName} have been picked up`,
                    data: {
                        type: "pickup_confirmed",
                        orderId: args.orderId,
                        orderLocationId: args.orderLocationId,
                    },
                },
            );
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

// Internal mutation to recalculate amounts owed (includes proportional tax)
export const recalculateAmountsOwed = internalMutation({
    args: {
        orderId: v.id("orders"),
    },
    handler: async (ctx, args) => {
        // Get all order locations for tax distribution
        const orderLocations = await ctx.db
            .query("orderLocations")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        // Build per-location subtotals and tax multipliers
        // taxMultiplier = receiptTotal / subtotal (e.g. 1.08 for 8% tax)
        const locationTaxMultiplier = new Map<string, number>();
        for (const loc of orderLocations) {
            const locItems = await ctx.db
                .query("orderItems")
                .withIndex("by_orderLocationId", (q) =>
                    q.eq("orderLocationId", loc._id),
                )
                .collect();

            let locSubtotal = BigInt(0);
            for (const item of locItems) {
                if (item.priceInCents) {
                    locSubtotal += BigInt(item.quantity) * item.priceInCents;
                }
            }

            if (loc.receiptTotalInCents && locSubtotal > BigInt(0)) {
                // Use Number for the ratio since we'll round per-user anyway
                locationTaxMultiplier.set(
                    loc._id,
                    Number(loc.receiptTotalInCents) / Number(locSubtotal),
                );
            } else {
                locationTaxMultiplier.set(loc._id, 1);
            }
        }

        // Get all order users
        const orderUsers = await ctx.db
            .query("orderUsers")
            .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
            .collect();

        // Calculate total owed for each user (with proportional tax)
        for (const orderUser of orderUsers) {
            const userItems = await ctx.db
                .query("orderItems")
                .withIndex("by_orderUserId", (q) =>
                    q.eq("orderUserId", orderUser._id),
                )
                .collect();

            // Group user's item subtotals by location, then apply tax multiplier
            const subtotalByLocation = new Map<string, number>();
            for (const item of userItems) {
                if (item.priceInCents) {
                    const itemTotal = Number(
                        BigInt(item.quantity) * item.priceInCents,
                    );
                    const prev =
                        subtotalByLocation.get(item.orderLocationId) ?? 0;
                    subtotalByLocation.set(
                        item.orderLocationId,
                        prev + itemTotal,
                    );
                }
            }

            let totalOwed = 0;
            for (const [locId, subtotal] of subtotalByLocation) {
                const multiplier = locationTaxMultiplier.get(locId) ?? 1;
                totalOwed += subtotal * multiplier;
            }

            await ctx.db.patch(orderUser._id, {
                amountOwed: BigInt(Math.round(totalOwed)),
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
