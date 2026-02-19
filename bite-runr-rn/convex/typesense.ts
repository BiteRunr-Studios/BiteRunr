"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

function getTypesenseConfig() {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  if (!host) throw new Error("TYPESENSE_HOST not configured");
  if (!apiKey) throw new Error("TYPESENSE_API_KEY not configured");
  return { host, apiKey };
}

async function typesenseFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const { host, apiKey } = getTypesenseConfig();
  return fetch(`${host}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": apiKey,
      ...options.headers,
    },
  });
}

// Create the items collection if it doesn't exist
export const ensureCollection = internalAction({
  args: {},
  handler: async () => {
    // Check if collection already exists
    const checkRes = await typesenseFetch("/collections/items");
    if (checkRes.ok) {
      console.log("Typesense 'items' collection already exists");
      return;
    }

    const schema = {
      name: "items",
      fields: [
        { name: "id", type: "string" },
        { name: "name", type: "string" },
        { name: "locationId", type: "string", facet: true },
      ],
      token_separators: ["-", "'"],
    };

    const res = await typesenseFetch("/collections", {
      method: "POST",
      body: JSON.stringify(schema),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to create Typesense collection: ${res.status} ${body}`);
    }

    console.log("Created Typesense 'items' collection");
  },
});

// Index a single item into Typesense (fire-and-forget from mutations)
export const indexItem = internalAction({
  args: {
    itemId: v.string(),
    name: v.string(),
    locationId: v.string(),
  },
  handler: async (_ctx, args) => {
    const doc = {
      id: args.itemId,
      name: args.name,
      locationId: args.locationId,
    };

    const res = await typesenseFetch(
      `/collections/items/documents?action=upsert`,
      {
        method: "POST",
        body: JSON.stringify(doc),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`Failed to index item ${args.itemId}: ${res.status} ${body}`);
    }
  },
});

// Public search action — called from the frontend
export const searchItems = action({
  args: {
    locationId: v.id("locations"),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<{ _id: string; name: string; locationId: string }[]> => {
    // Authenticate
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) throw new Error("Not authenticated");

    try {
      const params = new URLSearchParams({
        q: args.query,
        query_by: "name",
        filter_by: `locationId:=${args.locationId}`,
        num_typos: "2",
        per_page: "50",
      });

      const res = await typesenseFetch(
        `/collections/items/documents/search?${params.toString()}`,
      );

      if (!res.ok) {
        throw new Error(`Typesense search failed: ${res.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();

      // Map to same shape as Convex search results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data.hits ?? []).map((hit: any) => ({
        _id: hit.document.id as string,
        name: hit.document.name as string,
        locationId: hit.document.locationId as string,
      }));
    } catch (error) {
      // Fallback to Convex built-in search
      console.error("Typesense search error, falling back to Convex search:", error);

      const fallbackResults = await ctx.runQuery(api.items.search, {
        locationId: args.locationId,
        query: args.query,
      });

      return fallbackResults.map((item) => ({
        _id: item._id as string,
        name: item.name,
        locationId: item.locationId as string,
      }));
    }
  },
});

// Bulk import all existing items into Typesense
export const bulkImportItems = internalAction({
  args: {},
  handler: async (ctx) => {
    // Ensure collection exists first
    await ctx.runAction(internal.typesense.ensureCollection, {});

    // Fetch all items from Convex
    const items = await ctx.runQuery(internal.typesenseHelpers.getAllItems, {});

    if (items.length === 0) {
      console.log("No items to import");
      return;
    }

    // Typesense import endpoint accepts JSONL
    const jsonl = items
      .map((item) =>
        JSON.stringify({
          id: item._id,
          name: item.name,
          locationId: item.locationId,
        }),
      )
      .join("\n");

    const { host, apiKey } = getTypesenseConfig();
    const res = await fetch(
      `${host}/collections/items/documents/import?action=upsert`,
      {
        method: "POST",
        headers: {
          "X-TYPESENSE-API-KEY": apiKey,
          "Content-Type": "text/plain",
        },
        body: jsonl,
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Bulk import failed: ${res.status} ${body}`);
    }

    const resultText = await res.text();
    const lines = resultText.trim().split("\n");
    const failures = lines.filter((line) => {
      try {
        return !JSON.parse(line).success;
      } catch {
        return true;
      }
    });

    console.log(
      `Imported ${items.length} items. ${failures.length} failures.`,
    );
    if (failures.length > 0) {
      console.error("Failed imports:", failures.slice(0, 5).join("\n"));
    }
  },
});
