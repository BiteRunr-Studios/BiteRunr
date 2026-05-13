import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFT_KEY_PREFIX = "manual-prices-draft:";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type ManualEntryState =
  | "idle"
  | "entering"
  | "saving"
  | "success"
  | "error";

interface ManualPricesDraft {
  prices: Record<string, number | null>; // orderItemId → priceInCents
  savedAt: number;
}

export interface UseManualPriceEntryResult {
  state: ManualEntryState;
  error: string | null;
  prices: Map<string, number | null>;
  orderItems: Array<{
    id: string;
    orderUserId: string;
    text: string;
    userName: string;
    priceInCents: number | null;
  }> | null;
  hasDraft: boolean;
  startManualEntry: () => void;
  updatePrice: (orderItemId: string, priceInCents: number | null) => void;
  saveAll: () => Promise<void>;
  dismiss: () => void;
  reset: () => void;
}

export function useManualPriceEntry(
  orderLocationId: Id<"orderLocations"> | null,
  orderId: Id<"orders"> | null,
): UseManualPriceEntryResult {
  const [state, setState] = useState<ManualEntryState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Map<string, number | null>>(new Map());
  const [hasDraft, setHasDraft] = useState(false);

  const confirmReceiptMatches = useMutation(
    api.receiptScanning.confirmReceiptMatches,
  );

  const orderItems = useQuery(
    api.receiptScanning.getOrderItemsForLocation,
    orderLocationId ? { orderLocationId } : "skip",
  );

  const draftKey = orderLocationId
    ? `${DRAFT_KEY_PREFIX}${orderLocationId}`
    : null;

  // Save draft when in entering state
  useEffect(() => {
    if (state !== "entering" || !draftKey) return;

    const draft: ManualPricesDraft = {
      prices: Object.fromEntries(prices),
      savedAt: Date.now(),
    };

    AsyncStorage.setItem(draftKey, JSON.stringify(draft)).catch((e) =>
      console.error("Failed to save manual prices draft:", e),
    );
  }, [state, prices, draftKey]);

  // Check for draft whenever the location changes
  useEffect(() => {
    if (!draftKey) {
      setHasDraft(false);
      return;
    }

    setHasDraft(false);
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!raw) return;
        const draft: ManualPricesDraft = JSON.parse(raw);

        if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
          AsyncStorage.removeItem(draftKey);
          return;
        }

        setHasDraft(true);
        setPrices(
          new Map(
            Object.entries(draft.prices).map(([k, v]) => [
              k,
              v as number | null,
            ]),
          ),
        );
      })
      .catch((e) => console.error("Failed to check manual prices draft:", e));
  }, [draftKey]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setPrices(new Map());
  }, []);

  const startManualEntry = useCallback(() => {
    // Initialize prices map from existing priceInCents values
    const initial = new Map<string, number | null>();
    if (orderItems) {
      for (const item of orderItems) {
        initial.set(item.id, item.priceInCents);
      }
    }

    // Overlay any draft values on top
    setPrices((prevPrices) => {
      if (prevPrices.size > 0) {
        // Merge: start with order item prices, overlay draft
        const merged = new Map(initial);
        for (const [id, price] of prevPrices) {
          if (price !== null) {
            merged.set(id, price);
          }
        }
        return merged;
      }
      return initial;
    });

    setState("entering");
    setError(null);
  }, [orderItems]);

  const updatePrice = useCallback(
    (orderItemId: string, priceInCents: number | null) => {
      setPrices((prev) => {
        const next = new Map(prev);
        next.set(orderItemId, priceInCents);
        return next;
      });
    },
    [],
  );

  const saveAll = useCallback(async () => {
    if (!orderId || !orderLocationId) {
      setError("No order or location selected");
      return;
    }

    try {
      setState("saving");

      const validMatches = Array.from(prices.entries())
        .filter(([, price]) => price !== null && price > 0)
        .map(([orderItemId, priceInCents]) => ({
          orderItemId: orderItemId as Id<"orderItems">,
          priceInCents: priceInCents as number,
        }));

      if (validMatches.length === 0) {
        setError("No prices to save");
        setState("error");
        return;
      }

      await confirmReceiptMatches({
        matches: validMatches,
        orderId,
        orderLocationId,
      });

      // Clear draft on success
      if (draftKey) {
        AsyncStorage.removeItem(draftKey).catch((e) =>
          console.error("Failed to clear draft after save:", e),
        );
        setHasDraft(false);
      }

      setState("success");
      setPrices(new Map());
      setError(null);
    } catch (err) {
      console.error("Error saving manual prices:", err);
      const message = err instanceof Error ? err.message : "";

      if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("Network request failed")
      ) {
        setError(
          "We're having trouble connecting right now. Please check your internet connection and try again.",
        );
      } else if (message.includes("Not authenticated")) {
        setError(
          "Your session has expired. Please sign in again and try once more.",
        );
      } else {
        setError("We couldn't save your prices. Please try again.");
      }
      setState("error");
    }
  }, [orderId, orderLocationId, prices, confirmReceiptMatches, draftKey]);

  const dismiss = useCallback(() => {
    setState("idle");
  }, []);

  return {
    state,
    error,
    prices,
    orderItems: orderItems ?? null,
    hasDraft,
    startManualEntry,
    updatePrice,
    saveAll,
    dismiss,
    reset,
  };
}
