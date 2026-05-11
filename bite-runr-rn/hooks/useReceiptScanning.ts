import { useState, useCallback, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { autoMatchReceiptItems } from "@/lib/fuzzy-match";

const DRAFT_KEY_PREFIX = "receipt-draft:";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type ScanState =
    | "idle"
    | "selecting"
    | "uploading"
    | "parsing"
    | "confirming"
    | "saving"
    | "success"
    | "error";

export interface ParsedReceiptItem {
    name: string;
    quantity: number;
    priceInCents: number | null;
    comboName?: string | null;
    comboItems?: string[];
    comboTotalInCents?: number | null;
}

export interface MatchedItem {
    id: string; // Stable unique identifier for React key
    receiptItem: ParsedReceiptItem;
    matchedOrderItemId: string | null;
    matchedItemName: string | null;
    matchedUserName: string | null;
    confidence: number;
    manualPriceInCents?: number | null;
}

interface ReceiptDraft {
    matchedItems: MatchedItem[];
    parsedItems: ParsedReceiptItem[];
    receiptStoreName: string | null;
    receiptTotal: number | null;
    savedAt: number;
}

export interface UseReceiptScanningResult {
    state: ScanState;
    error: string | null;
    parsedItems: ParsedReceiptItem[];
    matchedItems: MatchedItem[];
    receiptStoreName: string | null;
    receiptTotal: number | null;
    photoUri: string | null;
    hasDraft: boolean;
    startScan: (source: "camera" | "library") => Promise<void>;
    updateMatch: (
        index: number,
        orderItemId: string | null,
        priceInCents?: number | null,
    ) => void;
    confirmMatches: () => Promise<void>;
    cancelScan: () => void;
    dismissScan: () => void;
    clearDraft: () => Promise<void>;
    resumeDraft: () => Promise<void>;
    reset: () => void;
}

export function useReceiptScanning(
    orderLocationId: Id<"orderLocations"> | null,
    orderId: Id<"orders"> | null,
): UseReceiptScanningResult {
    const [state, setState] = useState<ScanState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [parsedItems, setParsedItems] = useState<ParsedReceiptItem[]>([]);
    const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
    const [receiptStoreName, setReceiptStoreName] = useState<string | null>(
        null,
    );
    const [receiptTotal, setReceiptTotal] = useState<number | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [hasDraft, setHasDraft] = useState(false);

    // Convex mutations and actions
    const generateUploadUrl = useMutation(
        api.receiptScanning.generateReceiptUploadUrl,
    );
    const parseReceipt = useAction(api.receiptScanning.parseReceipt);
    const confirmReceiptMatches = useMutation(
        api.receiptScanning.confirmReceiptMatches,
    );

    // Get order items for matching
    const orderItems = useQuery(
        api.receiptScanning.getOrderItemsForLocation,
        orderLocationId ? { orderLocationId } : "skip",
    );

    const draftKey = orderLocationId
        ? `${DRAFT_KEY_PREFIX}${orderLocationId}`
        : null;

    // Clear draft from AsyncStorage
    const clearDraft = useCallback(async () => {
        if (!draftKey) return;
        try {
            await AsyncStorage.removeItem(draftKey);
            setHasDraft(false);
        } catch (e) {
            console.error("Failed to clear receipt draft:", e);
        }
    }, [draftKey]);

    // Save draft to AsyncStorage when in confirming state
    useEffect(() => {
        if (state !== "confirming" || !draftKey) return;

        const draft: ReceiptDraft = {
            matchedItems,
            parsedItems,
            receiptStoreName,
            receiptTotal,
            savedAt: Date.now(),
        };

        AsyncStorage.setItem(draftKey, JSON.stringify(draft)).catch((e) =>
            console.error("Failed to save receipt draft:", e),
        );
    }, [state, matchedItems, parsedItems, receiptStoreName, receiptTotal, draftKey]);

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
                const draft: ReceiptDraft = JSON.parse(raw);

                if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
                    AsyncStorage.removeItem(draftKey);
                    return;
                }

                setHasDraft(true);
            })
            .catch((e) => console.error("Failed to check receipt draft:", e));
    }, [draftKey]);

    // Manually resume a saved draft (user-initiated)
    const resumeDraft = useCallback(async () => {
        if (!draftKey) return;
        try {
            const raw = await AsyncStorage.getItem(draftKey);
            if (!raw) return;
            const draft: ReceiptDraft = JSON.parse(raw);

            if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
                await AsyncStorage.removeItem(draftKey);
                setHasDraft(false);
                return;
            }

            setMatchedItems(draft.matchedItems);
            setParsedItems(draft.parsedItems);
            setReceiptStoreName(draft.receiptStoreName);
            setReceiptTotal(draft.receiptTotal);
            setState("confirming");
        } catch (e) {
            console.error("Failed to resume receipt draft:", e);
        }
    }, [draftKey]);

    const reset = useCallback(() => {
        setState("idle");
        setError(null);
        setParsedItems([]);
        setMatchedItems([]);
        setReceiptStoreName(null);
        setReceiptTotal(null);
        setPhotoUri(null);
    }, []);

    // Gentle close — sets state to idle but preserves the draft
    const dismissScan = useCallback(() => {
        setState("idle");
    }, []);

    const cancelScan = useCallback(() => {
        reset();
    }, [reset]);

    const startScan = useCallback(
        async (source: "camera" | "library") => {
            // Prevent starting a new scan while one is already in progress
            if (state !== "idle" && state !== "error" && state !== "success") {
                return;
            }

            if (!orderLocationId) {
                setError("No location selected");
                return;
            }

            // Clear any existing draft when starting a fresh scan
            if (draftKey) {
                AsyncStorage.removeItem(draftKey).catch((e) =>
                    console.error("Failed to clear old draft:", e),
                );
                setHasDraft(false);
            }

            try {
                setError(null);

                // Request permissions first (before any state changes)
                if (source === "camera") {
                    const { status } =
                        await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== "granted") {
                        setError(
                            "Camera permission is required to take photos",
                        );
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

                // Compress and convert to JPEG (handles HEIC, PNG, etc.)
                const manipulated = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 1500 } }],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
                );
                setPhotoUri(manipulated.uri);

                const uploadUrl = await generateUploadUrl();

                // Fetch the compressed image and upload
                const response = await fetch(manipulated.uri);
                const blob = await response.blob();

                const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    body: blob,
                    headers: {
                        "Content-Type": "image/jpeg",
                    },
                });

                if (!uploadResponse.ok) {
                    throw new Error("Failed to upload image");
                }

                const { storageId } = await uploadResponse.json();
                if (!storageId) {
                    throw new Error(
                        "Upload succeeded but no storage ID returned",
                    );
                }

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
                setReceiptTotal(parseResult.totalInCents ?? null);

                // Auto-match with order items
                if (orderItems) {
                    const matches = autoMatchReceiptItems(
                        parseResult.items,
                        orderItems.map((oi) => ({
                            id: oi.id,
                            text: oi.text,
                            userName: oi.userName,
                        })),
                    );
                    setMatchedItems(matches);
                } else {
                    // No order items to match, just set the parsed items
                    const timestamp = Date.now();
                    setMatchedItems(
                        parseResult.items.map((item, index) => ({
                            id: `receipt-item-${index}-${timestamp}`,
                            receiptItem: item,
                            matchedOrderItemId: null,
                            matchedItemName: null,
                            matchedUserName: null,
                            confidence: 0,
                        })),
                    );
                }

                setState("confirming");
            } catch (err) {
                console.error("Receipt scanning error:", err);
                const message = err instanceof Error ? err.message : "";

                // Translate common technical errors into short toast-friendly messages
                if (message.includes("Failed to upload image") || message.includes("no storage ID")) {
                    setError("Couldn't upload photo");
                } else if (message.includes("network") || message.includes("fetch") || message.includes("Network request failed")) {
                    setError("No internet connection");
                } else if (message.includes("Not authenticated")) {
                    setError("Session expired, please sign in");
                } else if (message.includes("Not authorized")) {
                    setError("Not authorized");
                } else {
                    setError("Couldn't scan receipt");
                }
                setState("error");
            }
        },
        [
            state,
            orderLocationId,
            orderItems,
            generateUploadUrl,
            parseReceipt,
            reset,
            draftKey,
        ],
    );

    const updateMatch = useCallback(
        (
            index: number,
            orderItemId: string | null,
            priceInCents?: number | null,
        ) => {
            setMatchedItems((prev) => {
                const updated = [...prev];
                if (updated[index]) {
                    // Find the order item name if we have an ID
                    const matchedOrderItem = orderItems?.find(
                        (oi) => oi.id === orderItemId,
                    );

                    updated[index] = {
                        ...updated[index],
                        matchedOrderItemId: orderItemId,
                        matchedItemName: matchedOrderItem?.text ?? null,
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
        [orderItems],
    );

    const confirmMatches = useCallback(async () => {
        if (!orderId || !orderLocationId) {
            setError("No order or location selected");
            return;
        }

        try {
            setState("saving");

            // Filter to only items with valid matches and prices
            const validMatches = matchedItems
                .filter(
                    (m) =>
                        m.matchedOrderItemId &&
                        (m.manualPriceInCents ?? m.receiptItem.priceInCents) !==
                            null,
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
                orderLocationId,
                receiptTotalInCents: receiptTotal ?? undefined,
            });

            // Clear draft on successful save
            if (draftKey) {
                AsyncStorage.removeItem(draftKey).catch((e) =>
                    console.error("Failed to clear draft after save:", e),
                );
                setHasDraft(false);
            }

            // Show success state briefly before resetting
            setState("success");
            setParsedItems([]);
            setMatchedItems([]);
            setReceiptStoreName(null);
            setReceiptTotal(null);
            setError(null);
        } catch (err) {
            console.error("Error saving matches:", err);
            const message = err instanceof Error ? err.message : "";

            if (message.includes("network") || message.includes("fetch") || message.includes("Network request failed")) {
                setError("No internet connection");
            } else if (message.includes("Not authenticated")) {
                setError("Session expired, please sign in");
            } else {
                setError("Couldn't save prices");
            }
            setState("error");
        }
    }, [
        orderId,
        orderLocationId,
        matchedItems,
        receiptTotal,
        confirmReceiptMatches,
        draftKey,
    ]);

    return {
        state,
        error,
        parsedItems,
        matchedItems,
        receiptStoreName,
        receiptTotal,
        photoUri,
        hasDraft,
        startScan,
        updateMatch,
        confirmMatches,
        cancelScan,
        dismissScan,
        clearDraft,
        resumeDraft,
        reset,
    };
}
