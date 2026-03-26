import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAction, useMutation, useQuery } from "convex/react";
import { Flow } from "react-native-animated-spinkit";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

function normalizeOrderItems(items: string[]) {
    return items.map((item) => item.trim()).filter(Boolean);
}

function areOrderItemsEqual(left: string[], right: string[]) {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((item, index) => item === right[index]);
}

function normalizeVoiceTranscript(text: string) {
    return text.replace(/\s+/g, " ").trim();
}

function mergeVoiceTranscriptSegments(committed: string, incoming: string) {
    const normalizedCommitted = normalizeVoiceTranscript(committed);
    const normalizedIncoming = normalizeVoiceTranscript(incoming);

    if (!normalizedIncoming) {
        return normalizedCommitted;
    }

    if (!normalizedCommitted) {
        return normalizedIncoming;
    }

    if (normalizedIncoming === normalizedCommitted) {
        return normalizedCommitted;
    }

    if (normalizedIncoming.startsWith(normalizedCommitted)) {
        return normalizedIncoming;
    }

    if (normalizedCommitted.startsWith(normalizedIncoming)) {
        return normalizedCommitted;
    }

    return normalizeVoiceTranscript(
        `${normalizedCommitted} ${normalizedIncoming}`,
    );
}

function extractSpeechTranscript(event: any) {
    const transcripts: string[] = [];

    const pushTranscript = (value: unknown) => {
        if (typeof value !== "string") {
            return;
        }

        const normalized = normalizeVoiceTranscript(value);
        if (normalized) {
            transcripts.push(normalized);
        }
    };

    pushTranscript(event?.transcript);

    if (Array.isArray(event?.results)) {
        for (const result of event.results) {
            pushTranscript(result);
            pushTranscript(result?.transcript);

            if (Array.isArray(result)) {
                for (const alternative of result) {
                    pushTranscript(alternative);
                    pushTranscript(alternative?.transcript);
                }
            }

            if (Array.isArray(result?.alternatives)) {
                for (const alternative of result.alternatives) {
                    pushTranscript(alternative?.transcript);
                }
            }
        }
    }

    return transcripts[0] ?? "";
}

function getSpeechErrorMessage(error: unknown) {
    const message =
        typeof error === "string"
            ? error
            : typeof error === "object" && error !== null && "error" in error
              ? String((error as { error?: unknown }).error ?? "")
              : "";

    if (
        message.includes("not-allowed") ||
        message.includes("permission") ||
        message.includes("denied")
    ) {
        return "Microphone access is required to use voice ordering.";
    }

    if (
        message.includes("no-speech") ||
        message.includes("speech-timeout") ||
        message.includes("audio-capture")
    ) {
        return "We didn't catch that. Try speaking a little closer to your phone.";
    }

    return "Voice ordering isn't available right now. Please try again.";
}

export default function WriteOrder() {
    const { orderUserId, orderId } = useLocalSearchParams<{
        orderUserId?: string;
        orderId?: string;
    }>();
    const { colorScheme } = useColorScheme();
    const navigation = useNavigation();
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
        null,
    );
    const [currentItems, setCurrentItems] = useState<string[]>([]);
    const [loadedItems, setLoadedItems] = useState<string[]>([]);
    const [itemInput, setItemInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isCompletingOrder, setIsCompletingOrder] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [voiceModalVisible, setVoiceModalVisible] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState("");
    const [displayedVoiceTranscript, setDisplayedVoiceTranscript] =
        useState("");
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const leaveInFlightRef = useRef(false);
    const skipBeforeRemovePersistRef = useRef(false);
    const isMountedRef = useRef(true);
    const shouldProcessVoiceResultRef = useRef(false);
    const hasProcessedVoiceResultRef = useRef(false);
    const voiceTranscriptRef = useRef("");
    const committedVoiceTranscriptRef = useRef("");
    const suppressVoiceEventsRef = useRef(false);
    const voiceSheetTranslateY = useRef(new Animated.Value(24)).current;
    const voiceSheetOpacity = useRef(new Animated.Value(0)).current;

    const orderLocations = useQuery(
        api.orderLocations.listForOrder,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );
    const replaceForUserLocation = useMutation(
        api.orderItems.replaceForUserLocation,
    );
    const parseVoiceOrderItems = useAction(api.orderItems.parseVoiceOrderItems);
    const setStatus = useMutation(api.orderUsers.setStatus);

    const selectedLocation = useMemo(() => {
        if (!orderLocations || orderLocations.length === 0) {
            return null;
        }

        return (
            orderLocations.find(
                (location) => location.id === selectedLocationId,
            ) ?? orderLocations[0]
        );
    }, [orderLocations, selectedLocationId]);

    const locationEntries = useQuery(
        api.orderItems.getForUserLocation,
        orderUserId && selectedLocation
            ? {
                  orderUserId: orderUserId as Id<"orderUsers">,
                  orderLocationId: selectedLocation.id as Id<"orderLocations">,
              }
            : "skip",
    );

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        voiceTranscriptRef.current = voiceTranscript;
    }, [voiceTranscript]);

    useEffect(() => {
        if (!voiceModalVisible) {
            setDisplayedVoiceTranscript("");
            return;
        }

        if (!voiceTranscript) {
            setDisplayedVoiceTranscript("");
            return;
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const animateTranscript = () => {
            setDisplayedVoiceTranscript((current) => {
                if (current === voiceTranscript) {
                    return current;
                }

                const currentLength = current.length;
                const nextChar = voiceTranscript[currentLength];

                if (
                    currentLength > 0 &&
                    voiceTranscript.startsWith(current) &&
                    nextChar === " "
                ) {
                    const nextValue = voiceTranscript.slice(
                        0,
                        Math.min(voiceTranscript.length, currentLength + 2),
                    );
                    timeoutId = setTimeout(animateTranscript, 16);
                    return nextValue;
                }

                if (
                    currentLength > 0 &&
                    voiceTranscript.startsWith(current) &&
                    voiceTranscript.length - currentLength > 8
                ) {
                    const nextValue = voiceTranscript.slice(
                        0,
                        Math.min(voiceTranscript.length, currentLength + 3),
                    );
                    timeoutId = setTimeout(animateTranscript, 18);
                    return nextValue;
                }

                if (voiceTranscript.startsWith(current)) {
                    const nextValue = voiceTranscript.slice(
                        0,
                        Math.min(voiceTranscript.length, currentLength + 1),
                    );
                    timeoutId = setTimeout(animateTranscript, 22);
                    return nextValue;
                }

                timeoutId = setTimeout(animateTranscript, 16);
                return voiceTranscript;
            });
        };

        timeoutId = setTimeout(animateTranscript, 16);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [voiceModalVisible, voiceTranscript]);

    useEffect(() => {
        if (!selectedLocation || locationEntries === undefined) {
            return;
        }

        const nextItems = normalizeOrderItems(
            locationEntries.entries.map((entry) => entry.text),
        );
        setCurrentItems(nextItems);
        setLoadedItems(nextItems);
        setItemInput("");
    }, [selectedLocation?.id, locationEntries]);

    useEffect(() => {
        if (!voiceModalVisible) {
            voiceSheetTranslateY.setValue(24);
            voiceSheetOpacity.setValue(0);
            return;
        }

        Animated.parallel([
            Animated.timing(voiceSheetTranslateY, {
                toValue: 0,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(voiceSheetOpacity, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    }, [voiceModalVisible, voiceSheetOpacity, voiceSheetTranslateY]);

    const processVoiceTranscript = useCallback(
        async (transcript: string) => {
            const normalizedTranscript = normalizeVoiceTranscript(transcript);
            if (!selectedLocation || !orderUserId) {
                return;
            }

            if (!normalizedTranscript) {
                setVoiceError(
                    "We didn't catch an order. Try again or type your items in.",
                );
                return;
            }

            setIsProcessingVoice(true);
            setVoiceError(null);

            try {
                const result = await parseVoiceOrderItems({
                    orderUserId: orderUserId as Id<"orderUsers">,
                    orderLocationId:
                        selectedLocation.id as Id<"orderLocations">,
                    existingItems: currentItems,
                    transcript: normalizedTranscript,
                });

                if (!isMountedRef.current) {
                    return;
                }

                if (result.items.length === 0) {
                    setVoiceError(
                        "We heard you, but couldn't turn that into order items. Try again or type it in.",
                    );
                    return;
                }

                setCurrentItems(result.items);
                setVoiceTranscript("");
                setDisplayedVoiceTranscript("");
                voiceTranscriptRef.current = "";
                setVoiceModalVisible(false);
                setSaveError(null);

                Toast.show({
                    type: "success",
                    text1: "Order updated",
                    text2: result.items.join(", "),
                    visibilityTime: 3000,
                });
            } catch (error: any) {
                if (!isMountedRef.current) {
                    return;
                }

                setVoiceError(
                    error?.message ??
                        "We couldn't process your voice order. Please try again.",
                );
            } finally {
                if (isMountedRef.current) {
                    setIsProcessingVoice(false);
                }
            }
        },
        [currentItems, orderUserId, parseVoiceOrderItems, selectedLocation],
    );

    useSpeechRecognitionEvent("start", () => {
        if (suppressVoiceEventsRef.current) {
            return;
        }

        setIsListening(true);
        setVoiceError(null);
    });

    useSpeechRecognitionEvent("result", (event: any) => {
        if (suppressVoiceEventsRef.current) {
            return;
        }

        const transcript = extractSpeechTranscript(event);
        if (!transcript) {
            return;
        }

        if (event?.isFinal) {
            const nextCommittedTranscript = mergeVoiceTranscriptSegments(
                committedVoiceTranscriptRef.current,
                transcript,
            );

            committedVoiceTranscriptRef.current = nextCommittedTranscript;
            voiceTranscriptRef.current = nextCommittedTranscript;
            setVoiceTranscript(nextCommittedTranscript);
            return;
        }

        const nextTranscript = mergeVoiceTranscriptSegments(
            committedVoiceTranscriptRef.current,
            transcript,
        );

        voiceTranscriptRef.current = nextTranscript;
        setVoiceTranscript(nextTranscript);
    });

    useSpeechRecognitionEvent("error", (event: any) => {
        setIsListening(false);
        if (suppressVoiceEventsRef.current) {
            suppressVoiceEventsRef.current = false;
            return;
        }

        shouldProcessVoiceResultRef.current = false;
        hasProcessedVoiceResultRef.current = true;
        committedVoiceTranscriptRef.current = "";
        setIsProcessingVoice(false);
        setVoiceError(getSpeechErrorMessage(event));
    });

    useSpeechRecognitionEvent("end", () => {
        setIsListening(false);

        if (suppressVoiceEventsRef.current) {
            suppressVoiceEventsRef.current = false;
            return;
        }

        if (
            shouldProcessVoiceResultRef.current &&
            !hasProcessedVoiceResultRef.current
        ) {
            hasProcessedVoiceResultRef.current = true;
            shouldProcessVoiceResultRef.current = false;
            void processVoiceTranscript(voiceTranscriptRef.current);
        }
    });

    const saveCurrentLocation = useCallback(
        async ({ background = false }: { background?: boolean } = {}) => {
            if (!selectedLocation || !orderUserId) {
                return true;
            }

            const normalizedCurrentItems = normalizeOrderItems([
                ...currentItems,
                itemInput,
            ]);
            const normalizedLoadedItems = normalizeOrderItems(loadedItems);
            if (
                areOrderItemsEqual(
                    normalizedCurrentItems,
                    normalizedLoadedItems,
                )
            ) {
                return true;
            }

            if (!background && isMountedRef.current) {
                setIsSaving(true);
            }
            if (isMountedRef.current) {
                setSaveError(null);
            }

            try {
                await replaceForUserLocation({
                    orderUserId: orderUserId as Id<"orderUsers">,
                    orderLocationId:
                        selectedLocation.id as Id<"orderLocations">,
                    text: normalizedCurrentItems.join("\n"),
                });

                if (isMountedRef.current) {
                    setCurrentItems(normalizedCurrentItems);
                    setLoadedItems(normalizedCurrentItems);
                    setItemInput("");
                }
                return true;
            } catch (error: any) {
                const message =
                    error?.message ??
                    "We couldn't save your order. Please try again.";
                if (isMountedRef.current) {
                    setSaveError(message);
                }
                if (background) {
                    Toast.show({
                        type: "error",
                        text1: "Couldn't save your order",
                        text2: message,
                        visibilityTime: 4000,
                    });
                } else {
                    Alert.alert("Couldn't save order", message);
                }
                return false;
            } finally {
                if (!background && isMountedRef.current) {
                    setIsSaving(false);
                }
            }
        },
        [
            currentItems,
            itemInput,
            loadedItems,
            orderUserId,
            replaceForUserLocation,
            selectedLocation,
        ],
    );

    const completeOrder = useCallback(
        async ({ background = false }: { background?: boolean } = {}) => {
            if (!orderId) {
                return false;
            }

            try {
                await setStatus({
                    orderId: orderId as Id<"orders">,
                    status: "done",
                });
                return true;
            } catch (error: any) {
                const message =
                    error?.message ??
                    "We couldn't finish your order. Please try again.";
                if (isMountedRef.current) {
                    setSaveError(message);
                }
                if (background) {
                    Toast.show({
                        type: "error",
                        text1: "Couldn't finish ordering",
                        text2: message,
                        visibilityTime: 4000,
                    });
                } else {
                    Alert.alert("Couldn't finish ordering", message);
                }
                return false;
            }
        },
        [orderId, setStatus],
    );

    const queueBackgroundExitPersist = useCallback(() => {
        if (leaveInFlightRef.current) {
            return;
        }

        leaveInFlightRef.current = true;

        void (async () => {
            const didSave = await saveCurrentLocation({ background: true });
            if (didSave) {
                await completeOrder({ background: true });
            }
            leaveInFlightRef.current = false;
        })();
    }, [completeOrder, saveCurrentLocation]);

    const finishOrderingAndLeave = useCallback(() => {
        if (isSaving || isCompletingOrder) {
            return;
        }

        void (async () => {
            setIsCompletingOrder(true);
            let didExit = false;

            try {
                const didSave = await saveCurrentLocation();
                if (!didSave) {
                    return;
                }

                const didComplete = await completeOrder();
                if (!didComplete) {
                    return;
                }

                skipBeforeRemovePersistRef.current = true;
                didExit = true;
                router.dismiss();
            } finally {
                if (!didExit && isMountedRef.current) {
                    setIsCompletingOrder(false);
                }
            }
        })();
    }, [completeOrder, isCompletingOrder, isSaving, saveCurrentLocation]);

    const addItem = useCallback(() => {
        const nextItem = itemInput.trim();
        if (!nextItem) {
            return;
        }

        setCurrentItems((prev) => [...prev, nextItem]);
        setItemInput("");
        setSaveError(null);
    }, [itemInput]);

    const removeItem = useCallback((itemIndex: number) => {
        setCurrentItems((prev) =>
            prev.filter((_, index) => index !== itemIndex),
        );
        setSaveError(null);
    }, []);

    const handleLocationPress = useCallback(
        async (nextLocationId: string) => {
            if (
                selectedLocation?.id === nextLocationId ||
                isSaving ||
                isCompletingOrder
            ) {
                return;
            }

            const didSave = await saveCurrentLocation();
            if (!didSave) {
                return;
            }

            setCurrentItems([]);
            setLoadedItems([]);
            setItemInput("");
            setSelectedLocationId(nextLocationId);
        },
        [
            isCompletingOrder,
            isSaving,
            saveCurrentLocation,
            selectedLocation?.id,
        ],
    );

    const resetVoiceState = useCallback(() => {
        setVoiceModalVisible(true);
        setVoiceTranscript("");
        setDisplayedVoiceTranscript("");
        voiceTranscriptRef.current = "";
        committedVoiceTranscriptRef.current = "";
        setVoiceError(null);
        setIsProcessingVoice(false);
        setIsListening(false);
    }, []);

    const openVoiceModal = useCallback(() => {
        resetVoiceState();
        shouldProcessVoiceResultRef.current = false;
        hasProcessedVoiceResultRef.current = false;
        suppressVoiceEventsRef.current = false;
    }, [resetVoiceState]);

    const clearVoiceDraft = useCallback(() => {
        setVoiceTranscript("");
        setDisplayedVoiceTranscript("");
        voiceTranscriptRef.current = "";
        committedVoiceTranscriptRef.current = "";
        setVoiceError(null);
        setIsProcessingVoice(false);
        setIsListening(false);
    }, []);

    const startVoiceOrdering = useCallback(async () => {
        if (!selectedLocation || !orderUserId) {
            return;
        }

        if (Platform.OS === "web") {
            Alert.alert(
                "Voice ordering unavailable",
                "Voice ordering is currently available in the native app only.",
            );
            return;
        }

        setVoiceError(null);
        setIsProcessingVoice(false);
        setIsListening(false);
        shouldProcessVoiceResultRef.current = true;
        hasProcessedVoiceResultRef.current = false;
        suppressVoiceEventsRef.current = false;

        try {
            const permissionResponse =
                await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            const permissionGranted =
                Boolean((permissionResponse as any)?.granted) ||
                (permissionResponse as any)?.status === "granted";

            if (!permissionGranted) {
                throw new Error("permission-denied");
            }

            ExpoSpeechRecognitionModule.start({
                lang: "en-US",
                interimResults: true,
                addsPunctuation: true,
                continuous: true,
                contextualStrings: currentItems.slice(0, 10),
                androidIntentOptions: {
                    EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 60_000,
                    EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS:
                        15_000,
                },
            });
        } catch (error) {
            shouldProcessVoiceResultRef.current = false;
            hasProcessedVoiceResultRef.current = true;
            committedVoiceTranscriptRef.current = "";
            setIsListening(false);
            setIsProcessingVoice(false);
            setVoiceError(getSpeechErrorMessage(error));
        }
    }, [currentItems, orderUserId, selectedLocation]);

    const stopVoiceOrdering = useCallback(async () => {
        try {
            ExpoSpeechRecognitionModule.stop();
        } catch (error) {
            setIsListening(false);
            setVoiceError(getSpeechErrorMessage(error));
        }
    }, []);

    const restartVoiceOrdering = useCallback(() => {
        suppressVoiceEventsRef.current = true;
        shouldProcessVoiceResultRef.current = false;
        hasProcessedVoiceResultRef.current = true;

        clearVoiceDraft();

        try {
            ExpoSpeechRecognitionModule.abort();
        } catch {}

        setTimeout(() => {
            if (!isMountedRef.current || !voiceModalVisible) {
                return;
            }

            void startVoiceOrdering();
        }, 150);
    }, [clearVoiceDraft, startVoiceOrdering, voiceModalVisible]);

    const closeVoiceModal = useCallback(async () => {
        suppressVoiceEventsRef.current = true;
        shouldProcessVoiceResultRef.current = false;
        hasProcessedVoiceResultRef.current = true;
        setVoiceModalVisible(false);
        clearVoiceDraft();

        try {
            ExpoSpeechRecognitionModule.abort();
        } catch {}
    }, [clearVoiceDraft]);

    useEffect(() => {
        return navigation.addListener("beforeRemove", (event) => {
            if (skipBeforeRemovePersistRef.current) {
                skipBeforeRemovePersistRef.current = false;
                return;
            }

            if (isCompletingOrder) {
                event.preventDefault();
                return;
            }

            queueBackgroundExitPersist();
        });
    }, [isCompletingOrder, navigation, queueBackgroundExitPersist]);

    if (orderLocations === undefined) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator
                    size="large"
                    color={NAV_THEME[colorScheme].primary}
                />
            </View>
        );
    }

    const itemKeyCounts = new Map<string, number>();
    const selectedLocationName = selectedLocation?.name ?? "Pickup Location";
    const totalLocations = orderLocations.length;
    const totalItems = currentItems.length;
    const headerDescription =
        totalLocations === 1
            ? "Add each item separately, including any modifiers."
            : `Add each item under the right pickup location across ${totalLocations} pickup spots.`;
    const voiceStatusLabel = voiceError
        ? "Try again"
        : isListening
          ? "Listening"
          : isProcessingVoice
            ? "Reviewing"
            : displayedVoiceTranscript
              ? "Captured"
              : "Ready";
    const voiceStatusMessage = voiceError
        ? voiceError
        : isProcessingVoice
          ? "Turning your words into order items."
          : isListening
            ? "Speak naturally and include quantities or modifiers."
            : displayedVoiceTranscript
              ? "Check the transcript below. You can start over if needed."
              : "Tap start and say the order once.";
    const voicePreviewLabel = displayedVoiceTranscript
        ? "Transcript"
        : isListening
          ? "Listening for your order"
          : "Try saying";

    return (
        <>
            <SafeAreaView edges={["top"]} />
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
                <Pressable
                    onPress={() => {
                        if (isCompletingOrder) {
                            return;
                        }

                        router.back();
                    }}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon
                        name="ChevronLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
                <Text
                    numberOfLines={1}
                    className="flex-1 mr-2 ml-2 text-xl font-semibold text-foreground">
                    Write Your Order
                </Text>
            </View>
            <View className="flex-1 bg-background">
                <View className="pt-4">
                    <View className="overflow-hidden">
                        <View className="px-4">
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8 }}>
                                {orderLocations.map((location) => {
                                    const isSelected =
                                        selectedLocation?.id === location.id;

                                    return (
                                        <Pressable
                                            key={location.id}
                                            onPress={() =>
                                                void handleLocationPress(
                                                    location.id,
                                                )
                                            }
                                            className={`flex-row items-center justify-center px-5 py-2 rounded-full ${
                                                isSelected
                                                    ? "bg-primary"
                                                    : "bg-muted"
                                            }`}>
                                            <Text
                                                className={`text-sm ${
                                                    isSelected
                                                        ? "text-white"
                                                        : "text-muted-foreground"
                                                }`}>
                                                {location.name}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </View>

                {saveError ? (
                    <View className="flex-row gap-2 items-center px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
                        <Icon name="CircleAlert" size={18} color="#ef4444" />
                        <Text className="flex-1 text-sm text-destructive">
                            {saveError}
                        </Text>
                        <Pressable onPress={() => setSaveError(null)}>
                            <Icon name="X" size={16} color="#ef4444" />
                        </Pressable>
                    </View>
                ) : null}

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    className="flex-1">
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{
                            padding: 16,
                            paddingBottom: 40,
                        }}
                        keyboardDismissMode={
                            Platform.OS === "ios" ? "interactive" : "on-drag"
                        }
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                        <View className="p-4 rounded-[28px] border border-muted bg-card">
                            <View className="flex-row gap-2 items-center mb-3">
                                <View className="flex-1">
                                    <View className="flex-row flex-wrap gap-2 items-center">
                                        <Text className="text-base font-semibold text-foreground">
                                            Add items manually or by voice
                                        </Text>
                                    </View>
                                </View>
                                {isSaving || isCompletingOrder ? (
                                    <View className="flex-row gap-2 items-center px-3 py-2 rounded-full bg-primary/10">
                                        <ActivityIndicator
                                            size="small"
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                        <Text className="text-xs font-medium text-primary">
                                            {isCompletingOrder
                                                ? "Finishing"
                                                : "Saving"}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {locationEntries === undefined &&
                            selectedLocation ? (
                                <View className="justify-center items-center py-12">
                                    <ActivityIndicator
                                        size="large"
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                            ) : (
                                <View className="gap-3">
                                    <View className="flex-row gap-2 items-center">
                                        <View className="flex-1">
                                            <Input
                                                value={itemInput}
                                                placeholder="Add an item"
                                                errorMessage={null}
                                                inputClassName="flex-1 h-full text-base font-regular text-foreground placeholder:text-muted-foreground"
                                                onChangeText={(text) => {
                                                    setItemInput(text);
                                                    if (saveError) {
                                                        setSaveError(null);
                                                    }
                                                }}
                                                autoCapitalize="none"
                                                returnKeyType="done"
                                                blurOnSubmit={false}
                                                onSubmitEditing={addItem}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            onPress={addItem}
                                            disabled={
                                                isSaving || isCompletingOrder
                                            }
                                            className={`flex-row items-center justify-center min-w-[96px] h-[55px] px-4 rounded-xl gap-2 ${
                                                isSaving || isCompletingOrder
                                                    ? "bg-primary/50"
                                                    : "bg-primary"
                                            }`}>
                                            <Icon
                                                name="Plus"
                                                size={18}
                                                color="white"
                                            />
                                            <Text className="text-sm font-semibold text-white">
                                                Add
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        onPress={openVoiceModal}
                                        disabled={
                                            isSaving ||
                                            isCompletingOrder ||
                                            isProcessingVoice
                                        }
                                        className={`flex-row items-center justify-center h-[52px] px-4 rounded-xl gap-2 border ${
                                            isSaving ||
                                            isCompletingOrder ||
                                            isProcessingVoice
                                                ? "border-primary/20 bg-primary/5"
                                                : "border-primary/30 bg-primary/10"
                                        }`}>
                                        <Icon
                                            name="Mic"
                                            size={18}
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                        <Text className="text-sm font-semibold text-primary">
                                            Use voice
                                        </Text>
                                    </TouchableOpacity>

                                    <Text className="text-xs text-muted-foreground">
                                        Use one line per item so the summary
                                        stays easy to scan.
                                    </Text>

                                    {currentItems.length > 0 ? (
                                        <View className="gap-3 pt-1">
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-xs font-semibold tracking-[1px] uppercase text-primary">
                                                    Current order
                                                </Text>
                                                <Text className="text-xs text-muted-foreground">
                                                    {totalItems}{" "}
                                                    {totalItems === 1
                                                        ? "item"
                                                        : "items"}
                                                </Text>
                                            </View>
                                            {currentItems.map((item, index) => {
                                                const occurrence =
                                                    itemKeyCounts.get(item) ??
                                                    0;
                                                itemKeyCounts.set(
                                                    item,
                                                    occurrence + 1,
                                                );

                                                return (
                                                    <View
                                                        key={`${selectedLocation?.id ?? "location"}-${item}-${occurrence}`}
                                                        className="flex-row gap-3 items-center p-4 rounded-2xl border border-muted bg-background">
                                                        <View className="justify-center items-center w-8 h-8 rounded-2xl bg-primary/10">
                                                            <Text className="text-xs font-semibold text-primary">
                                                                {index + 1}
                                                            </Text>
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-sm font-semibold text-foreground">
                                                                {item}
                                                            </Text>
                                                        </View>
                                                        <View className="justify-center items-center self-center">
                                                            <Pressable
                                                                onPress={() =>
                                                                    removeItem(
                                                                        index,
                                                                    )
                                                                }
                                                                hitSlop={10}
                                                                accessibilityRole="button"
                                                                accessibilityLabel="Remove item"
                                                                className="justify-center items-center w-9 h-9 rounded-full border border-destructive/20 bg-destructive/10 active:opacity-70">
                                                                <Icon
                                                                    name="Trash2"
                                                                    size={16}
                                                                    color={
                                                                        NAV_THEME[
                                                                            colorScheme
                                                                        ]
                                                                            .notification
                                                                    }
                                                                />
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <View className="justify-center items-center px-5 py-8 rounded-2xl border border-dashed border-primary/20 bg-primary/5">
                                            <View className="justify-center items-center w-14 h-14 rounded-2xl bg-primary/10">
                                                <Icon
                                                    name="UtensilsCrossed"
                                                    size={24}
                                                    color={
                                                        NAV_THEME[colorScheme]
                                                            .primary
                                                    }
                                                />
                                            </View>
                                            <Text className="mt-4 text-base font-semibold text-foreground">
                                                Nothing added yet
                                            </Text>
                                            <Text className="mt-2 text-sm text-center text-muted-foreground">
                                                Type your first item or use
                                                voice to have AI build the list
                                                for {selectedLocationName}.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    <TouchableOpacity
                        className={`items-center justify-center w-full h-[55px] rounded-xl ${
                            isCompletingOrder ? "bg-primary/50" : "bg-primary"
                        }`}
                        disabled={isCompletingOrder}
                        onPress={finishOrderingAndLeave}>
                        <Text className="text-base font-semibold text-center text-white">
                            {isCompletingOrder
                                ? "Finishing Order..."
                                : "I'm Done Ordering"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    visible={voiceModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => void closeVoiceModal()}>
                    <Pressable
                        className="flex-1 justify-end bg-black/45"
                        onPress={() => void closeVoiceModal()}>
                        <Animated.View
                            style={{
                                opacity: voiceSheetOpacity,
                                transform: [
                                    { translateY: voiceSheetTranslateY },
                                ],
                            }}
                        >
                            <Pressable
                            onPress={(event) => event.stopPropagation()}
                            className="rounded-t-[30px] border-t border-border bg-card px-5 pt-3 pb-8">
                            <View className="self-center w-10 h-1.5 rounded-full bg-border" />

                            <View className="flex-row items-start justify-between mt-4">
                                <View className="flex-1 pr-4">
                                    <Text className="text-xl font-semibold text-foreground">
                                        Add items by voice
                                    </Text>
                                    <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                                        Speak once, then review before we update your list.
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => void closeVoiceModal()}
                                    hitSlop={10}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close voice ordering"
                                    className="items-center justify-center w-9 h-9 rounded-full bg-muted">
                                    <Icon
                                        name="X"
                                        size={18}
                                        color={NAV_THEME[colorScheme].text}
                                    />
                                </Pressable>
                            </View>

                            <View className="flex-row items-center gap-4 p-4 mt-5 rounded-2xl border border-border bg-background">
                                <View
                                    className={`items-center justify-center w-12 h-12 rounded-full ${
                                        voiceError
                                            ? "bg-destructive/10"
                                            : isListening
                                              ? "bg-primary"
                                              : "bg-primary/10"
                                    }`}>
                                    {isProcessingVoice ? (
                                        <Flow
                                            size={18}
                                            color={
                                                colorScheme === "dark"
                                                    ? "#ffffff"
                                                    : NAV_THEME[colorScheme]
                                                          .primary
                                            }
                                        />
                                    ) : (
                                        <Icon
                                            name={
                                                voiceError
                                                    ? "CircleAlert"
                                                    : isListening
                                                      ? "Mic"
                                                      : "MessageSquareText"
                                            }
                                            size={20}
                                            color={
                                                voiceError
                                                    ? "#ef4444"
                                                    : isListening
                                                      ? "white"
                                                      : NAV_THEME[colorScheme]
                                                            .primary
                                            }
                                        />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text
                                        className={`text-sm font-semibold ${
                                            voiceError
                                                ? "text-destructive"
                                                : "text-foreground"
                                        }`}>
                                        {voiceStatusLabel}
                                    </Text>
                                    <Text
                                        className={`mt-1 text-sm leading-5 ${
                                            voiceError
                                                ? "text-destructive"
                                                : "text-muted-foreground"
                                        }`}>
                                        {voiceStatusMessage}
                                    </Text>
                                </View>
                            </View>

                            <View className="mt-4 rounded-2xl bg-muted px-4 py-4">
                                <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                                    {voicePreviewLabel}
                                </Text>
                                <Text className="mt-2 text-sm leading-6 text-foreground">
                                    {displayedVoiceTranscript ||
                                        (isListening
                                            ? "Listening..."
                                            : "Two spicy chicken sandwiches, one fry, and a Coke with no ice.")}
                                </Text>
                            </View>

                            {(isListening || voiceTranscript || voiceError) && (
                                <TouchableOpacity
                                    onPress={restartVoiceOrdering}
                                    disabled={isProcessingVoice}
                                    className="self-start px-3 py-2 mt-3 rounded-full bg-primary/10">
                                    <Text
                                        className={`text-sm font-medium ${
                                            isProcessingVoice
                                                ? "text-muted-foreground"
                                                : "text-primary"
                                        }`}>
                                        Start over
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <View className="flex-row gap-3 mt-6">
                                <TouchableOpacity
                                    onPress={() => void closeVoiceModal()}
                                    className="flex-1 items-center justify-center h-[52px] rounded-xl border border-border bg-background">
                                    <Text className="text-sm font-semibold text-foreground">
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                {isListening ? (
                                    <TouchableOpacity
                                        onPress={() => void stopVoiceOrdering()}
                                        className="flex-1 flex-row items-center justify-center h-[52px] gap-2 rounded-xl bg-primary">
                                        <Icon
                                            name="Square"
                                            size={16}
                                            color="white"
                                        />
                                        <Text className="text-sm font-semibold text-white">
                                            Stop
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => void startVoiceOrdering()}
                                        disabled={isProcessingVoice}
                                        className={`flex-1 flex-row items-center justify-center h-[52px] gap-2 rounded-xl ${
                                            isProcessingVoice
                                                ? "bg-primary/50"
                                                : "bg-primary"
                                        }`}>
                                        {isProcessingVoice ? (
                                            <Flow size={22} color="white" />
                                        ) : (
                                            <Icon
                                                name="Mic"
                                                size={16}
                                                color="white"
                                            />
                                        )}
                                        <Text className="text-sm font-semibold text-white">
                                            {isProcessingVoice
                                                ? "Processing..."
                                                : voiceTranscript
                                                  ? "Listen Again"
                                                  : "Start"}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            </Pressable>
                        </Animated.View>
                    </Pressable>
                </Modal>
            </View>
        </>
    );
}
