import { useState, useCallback } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import { autoMatchReceiptItems } from "@/lib/fuzzy-match";

export type ScanState =
  | "idle"
  | "selecting"
  | "uploading"
  | "parsing"
  | "confirming"
  | "saving"
  | "error";

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  priceInCents: number | null;
}

export interface MatchedItem {
  receiptItem: ParsedReceiptItem;
  matchedOrderItemId: string | null;
  matchedItemName: string | null;
  matchedUserName: string | null;
  confidence: number;
  manualPriceInCents?: number | null;
}

export interface UseReceiptScanningResult {
  state: ScanState;
  error: string | null;
  parsedItems: ParsedReceiptItem[];
  matchedItems: MatchedItem[];
  receiptStoreName: string | null;
  receiptTotal: number | null;
  startScan: (source: "camera" | "library") => Promise<void>;
  updateMatch: (
    index: number,
    orderItemId: string | null,
    priceInCents?: number | null
  ) => void;
  confirmMatches: () => Promise<void>;
  cancelScan: () => void;
  reset: () => void;
}

export function useReceiptScanning(
  orderLocationId: Id<"orderLocations"> | null,
  orderId: Id<"orders"> | null
): UseReceiptScanningResult {
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedReceiptItem[]>([]);
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
  const [receiptStoreName, setReceiptStoreName] = useState<string | null>(null);
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null);

  // Convex mutations and actions
  const generateUploadUrl = useMutation(
    api.receiptScanning.generateReceiptUploadUrl
  );
  const parseReceipt = useAction(api.receiptScanning.parseReceipt);
  const confirmReceiptMatches = useMutation(
    api.receiptScanning.confirmReceiptMatches
  );

  // Get order items for matching
  const orderItems = useQuery(
    api.receiptScanning.getOrderItemsForLocation,
    orderLocationId ? { orderLocationId } : "skip"
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setParsedItems([]);
    setMatchedItems([]);
    setReceiptStoreName(null);
    setReceiptTotal(null);
  }, []);

  const cancelScan = useCallback(() => {
    reset();
  }, [reset]);

  const startScan = useCallback(
    async (source: "camera" | "library") => {
      // Prevent starting a new scan while one is already in progress
      if (state !== "idle" && state !== "error") {
        return;
      }

      if (!orderLocationId) {
        setError("No location selected");
        return;
      }

      try {
        setError(null);

        // Request permissions first (before any state changes)
        if (source === "camera") {
          const { status } =
            await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            setError("Camera permission is required to take photos");
            setState("error");
            return;
          }
        } else {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            setError("Photo library permission is required");
            setState("error");
            return;
          }
        }

        // Small delay to let action sheet fully close before opening picker
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Pick or take image (don't set state until after picker returns)
        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"],
                quality: 0.8,
                base64: false,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.8,
                base64: false,
              });

        if (result.canceled || !result.assets?.[0]) {
          // User cancelled, stay in idle state
          return;
        }

        const asset = result.assets[0];

        // Upload to Convex storage
        setState("uploading");

        const uploadUrl = await generateUploadUrl();

        // Fetch the image and upload
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          body: blob,
          headers: {
            "Content-Type": asset.mimeType || "image/jpeg",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const { storageId } = await uploadResponse.json();

        // Parse the receipt
        setState("parsing");

        const parseResult = await parseReceipt({
          storageId: storageId as Id<"_storage">,
          orderLocationId,
        });

        if (!parseResult.success || !parseResult.items) {
          setError(parseResult.error || "Failed to parse receipt");
          setState("error");
          return;
        }

        setParsedItems(parseResult.items);
        setReceiptStoreName(parseResult.storeName || null);
        setReceiptTotal(parseResult.totalInCents || null);

        // Auto-match with order items
        if (orderItems) {
          const matches = autoMatchReceiptItems(
            parseResult.items,
            orderItems.map((oi) => ({
              id: oi.id,
              itemName: oi.itemName,
              quantity: oi.quantity,
              userName: oi.userName,
            }))
          );
          setMatchedItems(matches);
        } else {
          // No order items to match, just set the parsed items
          setMatchedItems(
            parseResult.items.map((item) => ({
              receiptItem: item,
              matchedOrderItemId: null,
              matchedItemName: null,
              matchedUserName: null,
              confidence: 0,
            }))
          );
        }

        setState("confirming");
      } catch (err) {
        console.error("Receipt scanning error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setState("error");
      }
    },
    [state, orderLocationId, orderItems, generateUploadUrl, parseReceipt, reset]
  );

  const updateMatch = useCallback(
    (
      index: number,
      orderItemId: string | null,
      priceInCents?: number | null
    ) => {
      setMatchedItems((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          // Find the order item name if we have an ID
          const matchedOrderItem = orderItems?.find(
            (oi) => oi.id === orderItemId
          );

          updated[index] = {
            ...updated[index],
            matchedOrderItemId: orderItemId,
            matchedItemName: matchedOrderItem?.itemName ?? null,
            matchedUserName: matchedOrderItem?.userName ?? null,
            confidence: orderItemId ? 1 : 0, // Manual selection = 100% confidence
            manualPriceInCents:
              priceInCents !== undefined
                ? priceInCents
                : updated[index].manualPriceInCents,
          };
        }
        return updated;
      });
    },
    [orderItems]
  );

  const confirmMatches = useCallback(async () => {
    if (!orderId) {
      setError("No order selected");
      return;
    }

    try {
      setState("saving");

      // Filter to only items with valid matches and prices
      const validMatches = matchedItems
        .filter(
          (m) =>
            m.matchedOrderItemId &&
            (m.manualPriceInCents ?? m.receiptItem.priceInCents) !== null
        )
        .map((m) => ({
          orderItemId: m.matchedOrderItemId as Id<"orderItems">,
          priceInCents: (m.manualPriceInCents ??
            m.receiptItem.priceInCents) as number,
        }));

      if (validMatches.length === 0) {
        setError("No valid matches to save");
        setState("error");
        return;
      }

      await confirmReceiptMatches({
        matches: validMatches,
        orderId,
      });

      reset();
    } catch (err) {
      console.error("Error saving matches:", err);
      setError(err instanceof Error ? err.message : "Failed to save matches");
      setState("error");
    }
  }, [orderId, matchedItems, confirmReceiptMatches, reset]);

  return {
    state,
    error,
    parsedItems,
    matchedItems,
    receiptStoreName,
    receiptTotal,
    startScan,
    updateMatch,
    confirmMatches,
    cancelScan,
    reset,
  };
}
