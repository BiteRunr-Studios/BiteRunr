import { v } from "convex/values";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { action, query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { getUserId } from "./authHelper";
import {
  analyzeOrderItemTextGroups,
  buildOrderSummaryTextSignature,
  ResolvedOrderItemTextGroup,
} from "../lib/order-item-grouping";

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

function normalizeLabel(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

type SummaryLine = {
  id: string;
  orderUserId: string;
  text: string;
  sortOrder: number;
  userName: string;
  priceInCents: number | null;
};

type SummaryLocation = {
  id: string;
  orderLocationId: string;
  name: string;
};

type LocationSummary = {
  orderLocationId: string;
  locationName: string;
  lines: SummaryLine[];
  itemCount: number;
  subtotalInCents: number | null;
  taxInCents: number | null;
  totalInCents: number | null;
};

type OrderSummaryData = {
  order: {
    id: string;
    name: string;
    comments?: string | null;
    paused: boolean;
    createdAt: number;
  };
  locations: SummaryLocation[];
  locationSummaries: LocationSummary[];
  totalItems: number;
  totalPeople: number;
};

type AiOrderSummary = {
  signature: string;
  locations: Array<{
    orderLocationId: string;
    groups: ResolvedOrderItemTextGroup[];
  }>;
};

type AiSeedGroup = {
  seedGroupId: string;
  displayName: string;
  orderItemIds: string[];
  variants: string[];
  lineCount: number;
  peopleCount: number;
};

type AiLocationSeedSummary = {
  orderLocationId: string;
  locationName: string;
  seedGroups: AiSeedGroup[];
};

const aiLocationSummarySchema = z.object({
  groups: z.array(
    z.object({
      displayName: z.string().min(1),
      seedGroupIds: z.array(z.string()).min(1),
    }),
  ).min(1),
});

const AI_ORDER_SUMMARY_SYSTEM_PROMPT = `You are organizing a pickup summary for a single pickup location in a group food order.

Rules:
- You will receive seed groups for one location. Each seed group already merges exact text variants.
- Group seed groups that clearly refer to the same pickup item.
- Merge abbreviations, spacing variants, and common menu shorthand only when they describe the same item.
- Never merge different sizes, quantities, flavors, toppings, modifiers, combo variants, or customizations.
- Assign every seedGroupId to exactly one group.
- Return clean, human-readable display labels.
- Use only the provided seedGroupIds.`;

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("AI returned an empty summary response");
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("AI returned invalid summary JSON");
}

async function buildOrderSummary(
  orderId: string,
  rawSummary: OrderSummaryData | null,
): Promise<OrderSummaryData | null> {
  if (!rawSummary || rawSummary.order.id !== orderId) {
    return null;
  }

  return rawSummary;
}

function buildSummarySignature(summary: OrderSummaryData): string {
  return buildOrderSummaryTextSignature(
    summary.locationSummaries.map((locationSummary) => ({
      orderLocationId: locationSummary.orderLocationId,
      lines: locationSummary.lines,
    })),
  );
}

function buildAiSeedGroupsForLocation(
  locationSummary: LocationSummary,
): AiLocationSeedSummary {
  const analysis = analyzeOrderItemTextGroups(locationSummary.lines);

  return {
    orderLocationId: locationSummary.orderLocationId,
    locationName: locationSummary.locationName,
    seedGroups: analysis.groups.map((group, index) => ({
      seedGroupId: `g${index + 1}`,
      displayName: normalizeLabel(group.displayName),
      orderItemIds: group.items.map((item) => item.id),
      variants: [...new Set(group.items.map((item) => normalizeLabel(item.text)))].slice(
        0,
        3,
      ),
      lineCount: group.lineCount,
      peopleCount: group.peopleCount,
    })),
  };
}

function validateAiGroupsForLocation(
  locationSummary: AiLocationSeedSummary,
  groups: Array<{
    displayName: string;
    seedGroupIds: string[];
  }>,
): ResolvedOrderItemTextGroup[] {
  if (groups.length === 0) {
    throw new Error(`AI returned no groups for ${locationSummary.locationName}`);
  }

  const seedGroupById = new Map(
    locationSummary.seedGroups.map((group) => [group.seedGroupId, group]),
  );
  const seenSeedGroupIds = new Set<string>();

  return groups.map((group) => {
    const displayName = normalizeLabel(group.displayName);
    if (!displayName) {
      throw new Error(
        `AI returned an empty group label for ${locationSummary.locationName}`,
      );
    }

    const uniqueSeedGroupIds = [...new Set(group.seedGroupIds)];
    if (uniqueSeedGroupIds.length !== group.seedGroupIds.length) {
      throw new Error(
        `AI returned duplicate seed groups for ${locationSummary.locationName}`,
      );
    }

    if (uniqueSeedGroupIds.length === 0) {
      throw new Error(
        `AI returned an empty group for ${locationSummary.locationName}`,
      );
    }

    const orderItemIds = uniqueSeedGroupIds.flatMap((seedGroupId) => {
      const seedGroup = seedGroupById.get(seedGroupId);
      if (!seedGroup) {
        throw new Error(
          `AI returned an unknown seed group for ${locationSummary.locationName}`,
        );
      }

      if (seenSeedGroupIds.has(seedGroupId)) {
        throw new Error(
          `AI assigned a seed group multiple times for ${locationSummary.locationName}`,
        );
      }

      seenSeedGroupIds.add(seedGroupId);
      return seedGroup.orderItemIds;
    });

    return {
      displayName,
      orderItemIds,
    };
  });
}

async function generateAiSummaryForLocation(
  locationSummary: AiLocationSeedSummary,
): Promise<AiOrderSummary["locations"][number]> {
  const openrouter = createOpenRouter();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10_000);
  const totalSeedGroups = locationSummary.seedGroups.length;

  try {
    const result = await generateText({
      model: openrouter.chat("qwen/qwen-turbo"),
      temperature: 0,
      maxOutputTokens: Math.min(1200, Math.max(250, totalSeedGroups * 50)),
      abortSignal: abortController.signal,
      system: AI_ORDER_SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Return JSON only. Do not use markdown fences.

Expected shape:
{
  "groups": [
    {
      "displayName": "string",
      "seedGroupIds": ["g1", "g2"]
    }
  ]
}

Input:
${JSON.stringify({
  orderLocationId: locationSummary.orderLocationId,
  locationName: locationSummary.locationName,
  seedGroups: locationSummary.seedGroups.map((group) => ({
    seedGroupId: group.seedGroupId,
    displayName: group.displayName,
    variants: group.variants,
    lineCount: group.lineCount,
    peopleCount: group.peopleCount,
  })),
})}`,
        },
      ],
      providerOptions: {
        openrouter: { reasoning: { exclude: true } },
      },
    });
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(extractJsonObject(result.text));
    } catch (error) {
      throw new Error(
        `AI returned invalid JSON for ${locationSummary.locationName}: ${
          error instanceof Error ? error.message : "Unknown parse error"
        }`,
      );
    }
    const parsedResult = aiLocationSummarySchema.parse(parsedJson);

    const groups = validateAiGroupsForLocation(
      locationSummary,
      parsedResult.groups.map((group) => ({
        displayName: group.displayName,
        seedGroupIds: group.seedGroupIds,
      })),
    );

    const assignedOrderItemIds = new Set(
      groups.flatMap((group) => group.orderItemIds),
    );
    const expectedOrderItemIds = locationSummary.seedGroups.flatMap(
      (group) => group.orderItemIds,
    );
    if (assignedOrderItemIds.size !== expectedOrderItemIds.length) {
      throw new Error(
        `AI missed order items for ${locationSummary.locationName}`,
      );
    }

    return {
      orderLocationId: locationSummary.orderLocationId,
      groups,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAiOrderSummaryResult(
  seedSummaries: AiLocationSeedSummary[],
): Promise<AiOrderSummary["locations"]> {
  return Promise.all(
    seedSummaries.map((locationSummary) =>
      generateAiSummaryForLocation(locationSummary),
    ),
  );
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

export const generateAiOrderSummary = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<AiOrderSummary> => {
    const rawSummary = (await ctx.runQuery(api.orderItems.getOrderSummary, {
      orderId: args.orderId,
    })) as OrderSummaryData | null;
    const summary = await buildOrderSummary(args.orderId, rawSummary);

    if (!summary) {
      throw new Error("Not authorized");
    }

    const signature = buildSummarySignature(summary);
    if (summary.locationSummaries.length === 0) {
      return {
        signature,
        locations: [],
      };
    }

    const seedSummaries = summary.locationSummaries.map((locationSummary) =>
      buildAiSeedGroupsForLocation(locationSummary),
    );
    const locations = await generateAiOrderSummaryResult(seedSummaries);

    return {
      signature,
      locations,
    };
  },
});

export const getOrderSummary = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<OrderSummaryData | null> => {
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
