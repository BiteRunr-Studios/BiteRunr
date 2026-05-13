import { useAction } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { buildOrderSummaryTextSignature } from "@/lib/order-item-grouping";

export type SummaryLine = {
  id: string;
  orderUserId: string;
  text: string;
  sortOrder: number;
  userName: string;
  priceInCents: number | null;
};

export type LocationSummary = {
  orderLocationId: string;
  locationName: string;
  lines: SummaryLine[];
  itemCount: number;
  subtotalInCents: number | null;
  taxInCents: number | null;
  totalInCents: number | null;
};

export type RawOrderSummaryData = {
  order: {
    id: string;
    name: string;
    comments?: string | null;
    paused: boolean;
    createdAt: number;
  };
  pausedAiSummary: AiOrderSummary | null;
  locations: Array<{
    id: string;
    orderLocationId: string;
    name: string;
  }>;
  locationSummaries: LocationSummary[];
  totalItems: number;
  totalPeople: number;
};

export type AiOrderSummary = {
  signature: string;
  locations: Array<{
    orderLocationId: string;
    groups: Array<{
      displayName: string;
      orderItemIds: string[];
    }>;
  }>;
};

export type AiOrderSummaryStatus =
  | "loading-data"
  | "summarizing"
  | "ready"
  | "ai-error";

export interface UseAiOrderSummaryResult {
  status: AiOrderSummaryStatus;
  aiSummary: AiOrderSummary | null;
  retry: () => void;
  error: string | null;
}

type GenerateAiOrderSummaryAction = (args: {
  orderId: Id<"orders">;
}) => Promise<AiOrderSummary>;

const AI_ORDER_SUMMARY_PREFETCH_TTL_MS = 15_000;
const pendingAiSummaryRequests = new Map<string, Promise<AiOrderSummary>>();
const recentAiSummaryResults = new Map<
  string,
  { createdAt: number; result: AiOrderSummary }
>();

function getFreshAiSummaryResult(orderId: Id<"orders">): AiOrderSummary | null {
  const cached = recentAiSummaryResults.get(orderId);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.createdAt > AI_ORDER_SUMMARY_PREFETCH_TTL_MS) {
    recentAiSummaryResults.delete(orderId);
    return null;
  }

  return cached.result;
}

function clearAiOrderSummaryRequestCache(orderId: Id<"orders">) {
  pendingAiSummaryRequests.delete(orderId);
  recentAiSummaryResults.delete(orderId);
}

export function primeAiOrderSummaryRequest(
  generateAiOrderSummary: GenerateAiOrderSummaryAction,
  orderId: Id<"orders">,
): Promise<AiOrderSummary> {
  const freshResult = getFreshAiSummaryResult(orderId);
  if (freshResult) {
    return Promise.resolve(freshResult);
  }

  const pendingRequest = pendingAiSummaryRequests.get(orderId);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = generateAiOrderSummary({ orderId })
    .then((result) => {
      recentAiSummaryResults.set(orderId, {
        createdAt: Date.now(),
        result,
      });
      pendingAiSummaryRequests.delete(orderId);
      return result;
    })
    .catch((error) => {
      clearAiOrderSummaryRequestCache(orderId);
      throw error;
    });

  pendingAiSummaryRequests.set(orderId, request);
  return request;
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("aborted") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("ECONNREFUSED")
  ) {
    return "Summarizing this order took too long. Please try again.";
  }

  return "We couldn't summarize this order right now.";
}

export function useAiOrderSummary(
  orderId: Id<"orders"> | null,
  rawSummary: RawOrderSummaryData | null | undefined,
): UseAiOrderSummaryResult {
  const generateAiOrderSummary = useAction(
    api.orderItems.generateAiOrderSummary,
  );
  const [_attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<AiOrderSummaryStatus>("loading-data");
  const [aiSummary, setAiSummary] = useState<AiOrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const signature = useMemo(() => {
    if (!rawSummary) {
      return null;
    }

    return buildOrderSummaryTextSignature(
      rawSummary.locationSummaries.map((locationSummary) => ({
        orderLocationId: locationSummary.orderLocationId,
        lines: locationSummary.lines,
      })),
    );
  }, [rawSummary]);
  const rawSummaryState =
    rawSummary === undefined
      ? "loading"
      : rawSummary === null
        ? "missing"
        : "ready";
  const persistedAiSummary =
    rawSummary?.order.paused &&
    rawSummary.pausedAiSummary &&
    rawSummary.pausedAiSummary.signature === signature
      ? rawSummary.pausedAiSummary
      : null;

  useEffect(() => {
    if (!orderId || rawSummaryState === "missing") {
      return;
    }

    if (rawSummaryState === "loading" || signature === null) {
      return;
    }

    if (persistedAiSummary) {
      requestIdRef.current += 1;
      setStatus("ready");
      setAiSummary(persistedAiSummary);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let isCancelled = false;

    void (async () => {
      setStatus("summarizing");
      setAiSummary(null);
      setError(null);

      try {
        let result = await primeAiOrderSummaryRequest(
          generateAiOrderSummary,
          orderId,
        );
        if (isCancelled || requestIdRef.current !== requestId) {
          return;
        }

        if (result.signature !== signature) {
          clearAiOrderSummaryRequestCache(orderId);
          result = await primeAiOrderSummaryRequest(
            generateAiOrderSummary,
            orderId,
          );
        }

        if (isCancelled || requestIdRef.current !== requestId) {
          return;
        }

        if (result.signature !== signature) {
          throw new Error("The order changed while we were summarizing it.");
        }

        setAiSummary(result);
        setStatus("ready");
      } catch (nextError) {
        if (isCancelled || requestIdRef.current !== requestId) {
          return;
        }

        setAiSummary(null);
        setError(getErrorMessage(nextError));
        setStatus("ai-error");
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    generateAiOrderSummary,
    orderId,
    persistedAiSummary,
    rawSummaryState,
    signature,
  ]);

  return {
    status,
    aiSummary,
    retry: () => {
      if (orderId) {
        clearAiOrderSummaryRequestCache(orderId);
      }
      setStatus("summarizing");
      setAiSummary(null);
      setError(null);
      setAttempt((currentAttempt) => currentAttempt + 1);
    },
    error,
  };
}
