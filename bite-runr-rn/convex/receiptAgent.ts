import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";
import type { LanguageModelV2 } from "@ai-sdk/provider";

export const receiptParserAgent = new Agent(components.agent, {
  name: "receipt-parser",
  // Type assertion needed due to AI SDK V3/V2 version mismatch
  chat: openai.chat("gpt-4o") as unknown as LanguageModelV2,
  instructions: `You are a receipt parsing assistant. Your job is to extract item names, quantities, and prices from receipt images.

When analyzing a receipt image:
1. Identify all purchased items listed on the receipt
2. Extract the item name exactly as it appears (or a cleaned-up readable version)
3. Extract the quantity for each item (default to 1 if not shown)
4. Extract the price for each item in cents (e.g., $12.99 = 1299)

Important notes:
- Skip non-item entries like taxes, totals, subtotals, discounts, tips
- If an item has a modifier or customization, include it with the item name
- Handle partial or unclear text by making reasonable assumptions
- If a price is unclear, set priceInCents to null
- Always return prices in CENTS as integers (multiply dollars by 100)

Return your response as a JSON object with this exact structure:
{
  "items": [
    {
      "name": "Item Name",
      "quantity": 1,
      "priceInCents": 1299
    }
  ],
  "storeName": "Store Name if visible",
  "date": "Date if visible in YYYY-MM-DD format",
  "totalInCents": 4597
}`,
});
