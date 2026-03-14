import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
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

function VoicePulseOrb({
    colorScheme,
    isListening,
    isProcessingVoice,
}: {
    colorScheme: "light" | "dark";
    isListening: boolean;
    isProcessingVoice: boolean;
}) {
    const haloScale = useSharedValue(1);
    const haloOpacity = useSharedValue(0.2);
    const coreScale = useSharedValue(1);

    useEffect(() => {
        if (isListening) {
            haloScale.value = withRepeat(
                withSequence(
                    withTiming(1.35, {
                        duration: 1200,
                        easing: Easing.out(Easing.ease),
                    }),
                    withTiming(1, {
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ),
                -1,
                false,
            );
            haloOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.45, { duration: 900 }),
                    withTiming(0.18, { duration: 900 }),
                ),
                -1,
                false,
            );
            coreScale.value = withRepeat(
                withSequence(
                    withTiming(1.08, {
                        duration: 700,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    withTiming(1, {
                        duration: 700,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ),
                -1,
                false,
            );
            return;
        }

        if (isProcessingVoice) {
            haloScale.value = withRepeat(
                withSequence(
                    withTiming(1.18, { duration: 850 }),
                    withTiming(1, { duration: 850 }),
                ),
                -1,
                false,
            );
            haloOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.28, { duration: 700 }),
                    withTiming(0.14, { duration: 700 }),
                ),
                -1,
                false,
            );
            coreScale.value = withRepeat(
                withSequence(
                    withTiming(1.04, { duration: 650 }),
                    withTiming(1, { duration: 650 }),
                ),
                -1,
                false,
            );
            return;
        }

        cancelAnimation(haloScale);
        cancelAnimation(haloOpacity);
        cancelAnimation(coreScale);
        haloScale.value = withTiming(1, { duration: 250 });
        haloOpacity.value = withTiming(0.14, { duration: 250 });
        coreScale.value = withTiming(1, { duration: 250 });
    }, [coreScale, haloOpacity, haloScale, isListening, isProcessingVoice]);

    const haloStyle = useAnimatedStyle(() => ({
        opacity: haloOpacity.value,
        transform: [{ scale: haloScale.value }],
    }));

    const coreStyle = useAnimatedStyle(() => ({
        transform: [{ scale: coreScale.value }],
    }));

    return (
        <View className="justify-center items-center h-[170px]">
            <Animated.View
                style={haloStyle}
                className="absolute w-[148px] h-[148px] rounded-full bg-primary"
            />
            <View className="absolute w-[118px] h-[118px] rounded-full bg-primary/15" />
            <Animated.View
                style={coreStyle}
                className="justify-center items-center w-[92px] h-[92px] rounded-full border border-primary/20 bg-primary">
                <View className="justify-center items-center w-[72px] h-[72px] rounded-full bg-white/15">
                    <Icon
                        name={isProcessingVoice ? "Sparkles" : "Mic"}
                        size={30}
                        color="white"
                    />
                </View>
            </Animated.View>
            <View className="absolute top-5 right-10 px-2 py-1 rounded-full bg-white/10">
                <Text className="text-[10px] font-semibold tracking-[1px] uppercase text-white/90">
                    {isListening
                        ? "Live"
                        : isProcessingVoice
                          ? "AI"
                          : colorScheme === "dark"
                            ? "Ready"
                            : "Voice"}
                </Text>
            </View>
        </View>
    );
}

function VoiceBars({
    active,
    colorScheme,
}: {
    active: boolean;
    colorScheme: "light" | "dark";
}) {
    const barA = useSharedValue(0.35);
    const barB = useSharedValue(0.65);
    const barC = useSharedValue(0.45);
    const barD = useSharedValue(0.8);

    useEffect(() => {
        const animateBar = (value: typeof barA, delayScale: number) => {
            value.value = withRepeat(
                withSequence(
                    withTiming(0.25 + delayScale, {
                        duration: 260,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    withTiming(0.95 - delayScale / 3, {
                        duration: 420,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    withTiming(0.4 + delayScale / 2, {
                        duration: 320,
                        easing: Easing.inOut(Easing.ease),
                    }),
                ),
                -1,
                false,
            );
        };

        if (active) {
            animateBar(barA, 0.1);
            animateBar(barB, 0.22);
            animateBar(barC, 0.14);
            animateBar(barD, 0.28);
            return;
        }

        [barA, barB, barC, barD].forEach((value) => {
            cancelAnimation(value);
            value.value = withTiming(0.38, { duration: 220 });
        });
    }, [active, barA, barB, barC, barD]);

    const barAStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: barA.value }],
        opacity: 0.55 + barA.value * 0.45,
    }));
    const barBStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: barB.value }],
        opacity: 0.55 + barB.value * 0.45,
    }));
    const barCStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: barC.value }],
        opacity: 0.55 + barC.value * 0.45,
    }));
    const barDStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: barD.value }],
        opacity: 0.55 + barD.value * 0.45,
    }));

    const barStyles = [barAStyle, barBStyle, barCStyle, barDStyle];

    return (
        <View className="flex-row gap-2 items-end h-10">
            {barStyles.map((style, index) => (
                <Animated.View
                    key={`voice-bar-${index}`}
                    style={style}
                    className={`w-2 h-10 rounded-full ${
                        colorScheme === "dark" ? "bg-white/80" : "bg-primary"
                    }`}
                />
            ))}
        </View>
    );
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
    const [saveError, setSaveError] = useState<string | null>(null);
    const [voiceModalVisible, setVoiceModalVisible] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState("");
    const [displayedVoiceTranscript, setDisplayedVoiceTranscript] = useState("");
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const leaveInFlightRef = useRef(false);
    const isMountedRef = useRef(true);
    const shouldProcessVoiceResultRef = useRef(false);
    const hasProcessedVoiceResultRef = useRef(false);
    const voiceTranscriptRef = useRef("");

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
                    orderLocationId: selectedLocation.id as Id<"orderLocations">,
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
        setIsListening(true);
        setVoiceError(null);
    });

    useSpeechRecognitionEvent("result", (event: any) => {
        const transcript = extractSpeechTranscript(event);
        if (transcript) {
            setVoiceTranscript(transcript);
        }
    });

    useSpeechRecognitionEvent("error", (event: any) => {
        setIsListening(false);
        shouldProcessVoiceResultRef.current = false;
        hasProcessedVoiceResultRef.current = true;
        setIsProcessingVoice(false);
        setVoiceError(getSpeechErrorMessage(event));
    });

    useSpeechRecognitionEvent("end", () => {
        setIsListening(false);

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
        queueBackgroundExitPersist();
        router.dismiss();
    }, [queueBackgroundExitPersist]);

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
            if (selectedLocation?.id === nextLocationId || isSaving) {
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
        [isSaving, saveCurrentLocation, selectedLocation?.id],
    );

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

        setVoiceModalVisible(true);
        setVoiceTranscript("");
        setDisplayedVoiceTranscript("");
        voiceTranscriptRef.current = "";
        setVoiceError(null);
        setIsProcessingVoice(false);
        shouldProcessVoiceResultRef.current = true;
        hasProcessedVoiceResultRef.current = false;

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
                continuous: false,
                contextualStrings: currentItems.slice(0, 10),
            });
        } catch (error) {
            shouldProcessVoiceResultRef.current = false;
            hasProcessedVoiceResultRef.current = true;
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

    const closeVoiceModal = useCallback(async () => {
        shouldProcessVoiceResultRef.current = false;
        hasProcessedVoiceResultRef.current = true;
        setVoiceModalVisible(false);
        setVoiceTranscript("");
        setDisplayedVoiceTranscript("");
        voiceTranscriptRef.current = "";
        setVoiceError(null);
        setIsProcessingVoice(false);
        setIsListening(false);

        try {
            ExpoSpeechRecognitionModule.abort();
        } catch {}
    }, []);

    useEffect(() => {
        return navigation.addListener("beforeRemove", () => {
            queueBackgroundExitPersist();
        });
    }, [navigation, queueBackgroundExitPersist]);

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

    return (
        <>
            <SafeAreaView edges={["top"]} />
            <View className="flex-1 bg-background">
                <View className="pt-4 pb-4">
                    <View className="overflow-hidden border-y border-primary/15 bg-card">
                        <View className="px-4 pt-4 pb-3 bg-card">
                            <View className="flex-row items-start justify-between">
                                <View className="flex-1 pr-3">
                                    <Text className="text-2xl font-bold text-foreground">
                                        Write Your Order
                                    </Text>
                                    <Text className="mt-2 text-sm leading-5 text-muted-foreground">
                                        {headerDescription}
                                    </Text>
                                </View>
                                <View className="justify-center items-center w-12 h-12 rounded-2xl bg-primary/10">
                                    <Icon
                                        name="NotebookPen"
                                        size={20}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                            </View>

                        </View>

                        <View className="px-4 py-4">
                            <View className="flex-row items-center justify-between mb-3">
                                <View>
                                    <Text className="text-xs font-semibold tracking-[1px] uppercase text-primary">
                                        Pickup spots
                                    </Text>
                                    <Text className="mt-1 text-sm text-muted-foreground">
                                        Tap a location to add the right items there.
                                    </Text>
                                </View>
                                <View className="flex-row gap-2 items-center px-3 py-2 rounded-full bg-primary/10">
                                    <Icon
                                        name="Route"
                                        size={14}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                    <Text className="text-xs font-semibold text-primary">
                                        {totalLocations} total
                                    </Text>
                                </View>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="pt-1"
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
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                        <View className="p-4 rounded-[28px] border border-muted bg-card">
                            <View className="flex-row gap-2 items-center mb-3">
                                <View className="justify-center items-center w-10 h-10 rounded-2xl bg-primary/10">
                                    <Icon
                                        name="MapPin"
                                        size={18}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row flex-wrap gap-2 items-center">
                                        <Text className="text-base font-semibold text-foreground">
                                            Add items manually or by voice
                                        </Text>
                                        <View className="px-2.5 py-1 rounded-full bg-primary/10">
                                            <Text className="text-[10px] font-semibold tracking-[1px] uppercase text-primary">
                                                {selectedLocationName}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="mt-1 text-xs text-muted-foreground">
                                        Speak naturally or type each item with
                                        sizes, modifiers, and special requests.
                                    </Text>
                                </View>
                                {isSaving ? (
                                    <View className="flex-row gap-2 items-center px-3 py-2 rounded-full bg-primary/10">
                                        <ActivityIndicator
                                            size="small"
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                        <Text className="text-xs font-medium text-primary">
                                            Saving
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="flex-row gap-2 items-center px-3 py-2 rounded-full bg-primary/10">
                                        <Icon
                                            name="Sparkles"
                                            size={14}
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                        <Text className="text-xs font-medium text-primary">
                                            AI enabled
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {locationEntries === undefined && selectedLocation ? (
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
                                            disabled={isSaving}
                                            className={`flex-row items-center justify-center min-w-[96px] h-[55px] px-4 rounded-xl gap-2 ${
                                                isSaving
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
                                        onPress={() =>
                                            void startVoiceOrdering()
                                        }
                                        disabled={isSaving || isProcessingVoice}
                                        className={`flex-row items-center justify-center h-[52px] px-4 rounded-xl gap-2 border ${
                                            isSaving || isProcessingVoice
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
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-xs font-semibold tracking-[1px] uppercase text-primary">
                                                    Current order
                                                </Text>
                                                <Text className="text-xs text-muted-foreground">
                                                    {totalItems} {totalItems === 1 ? "item" : "items"}
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
                                                Type your first item or use voice
                                                to have AI build the list for{" "}
                                                {selectedLocationName}.
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
                        className="items-center justify-center w-full h-[55px] rounded-xl bg-primary"
                        onPress={finishOrderingAndLeave}>
                        <Text className="text-base font-semibold text-center text-white">
                            I'm Done Ordering
                        </Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    visible={voiceModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => void closeVoiceModal()}>
                    <View className="flex-1 justify-center px-6 bg-black/50">
                        <View className="overflow-hidden rounded-[28px] border border-border bg-card">
                            <View className="px-5 pt-5 pb-4 bg-primary">
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-1">
                                        <View className="self-start px-3 py-1 mb-3 rounded-full bg-white/15">
                                            <Text className="text-[11px] font-semibold tracking-[1.2px] uppercase text-white">
                                                BiteRunr AI
                                            </Text>
                                        </View>
                                        <Text className="text-2xl font-bold text-white">
                                            What's your order?
                                        </Text>
                                        <Text className="mt-1 text-sm text-white/80">
                                            {isListening
                                                ? "I'm listening for items, modifiers, and special requests."
                                                : isProcessingVoice
                                                  ? "I'm turning your words into clean order items now."
                                                  : "Tap in and speak naturally like you're talking to a person."}
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => void closeVoiceModal()}
                                        hitSlop={10}
                                        accessibilityRole="button"
                                        accessibilityLabel="Close voice ordering"
                                        className="justify-center items-center w-9 h-9 rounded-full bg-white/15">
                                        <Icon
                                            name="X"
                                            size={18}
                                            color="white"
                                        />
                                    </Pressable>
                                </View>

                                <VoicePulseOrb
                                    colorScheme={colorScheme}
                                    isListening={isListening}
                                    isProcessingVoice={isProcessingVoice}
                                />
                            </View>

                            <View className="p-5">
                                <View className="flex-row items-center justify-between px-4 py-3 rounded-2xl bg-primary/5">
                                    <View>
                                        <Text className="text-xs font-semibold tracking-[1px] uppercase text-primary">
                                            {isListening
                                                ? "Realtime capture"
                                                : isProcessingVoice
                                                  ? "AI interpretation"
                                                  : "Voice ready"}
                                        </Text>
                                        <Text className="mt-1 text-sm text-muted-foreground">
                                            {isListening
                                                ? "Speak your full order in one sentence."
                                                : isProcessingVoice
                                                  ? "Matching items and splitting lines."
                                                : "Try: two burgers, large fry, and a Diet Coke."}
                                        </Text>
                                    </View>
                                    <VoiceBars
                                        active={
                                            isListening || isProcessingVoice
                                        }
                                        colorScheme={colorScheme}
                                    />
                                </View>

                                <View className="p-4 mt-4 rounded-2xl border border-primary/10 bg-background">
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <Icon
                                            name={
                                                isProcessingVoice
                                                    ? "Sparkles"
                                                    : "MessageSquareText"
                                            }
                                            size={16}
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                        <Text className="text-xs font-semibold tracking-[1px] uppercase text-primary">
                                            {isProcessingVoice
                                                ? "AI Draft"
                                                : "Live Transcript"}
                                        </Text>
                                    </View>
                                    <Text className="text-base leading-6 text-foreground">
                                        {displayedVoiceTranscript ||
                                            "Say something like “two spicy chicken sandwiches, fries, and a Coke with no ice.”"}
                                    </Text>
                                </View>

                                {!voiceError &&
                                (isListening || isProcessingVoice) ? (
                                    <View className="flex-row gap-2 items-center px-3 py-3 mt-4 rounded-xl bg-primary/5">
                                        <ActivityIndicator
                                            size="small"
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                        <Text className="flex-1 text-sm text-primary">
                                            {isProcessingVoice
                                                ? "AI is cleaning up the transcript and extracting the actual order items."
                                                : "Listening for quantities, modifiers, combo names, and special requests."}
                                        </Text>
                                    </View>
                                ) : null}

                                {voiceError ? (
                                    <View className="flex-row gap-2 items-center px-3 py-3 mt-4 rounded-xl bg-destructive/10">
                                        <Icon
                                            name="CircleAlert"
                                            size={18}
                                            color="#ef4444"
                                        />
                                        <Text className="flex-1 text-sm text-destructive">
                                            {voiceError}
                                        </Text>
                                    </View>
                                ) : null}

                                <View className="flex-row gap-3 mt-5">
                                    <TouchableOpacity
                                        onPress={() => void closeVoiceModal()}
                                        className="flex-1 items-center justify-center h-[52px] rounded-xl border border-border bg-background">
                                        <Text className="text-sm font-semibold text-foreground">
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                    {isListening ? (
                                        <TouchableOpacity
                                            onPress={() =>
                                                void stopVoiceOrdering()
                                            }
                                            className="flex-1 flex-row gap-2 items-center justify-center h-[52px] rounded-xl bg-primary">
                                            <Icon
                                                name="Square"
                                                size={16}
                                                color="white"
                                            />
                                            <Text className="text-sm font-semibold text-white">
                                                Stop Listening
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() =>
                                                void startVoiceOrdering()
                                            }
                                            disabled={isProcessingVoice}
                                            className={`flex-1 flex-row gap-2 items-center justify-center h-[52px] rounded-xl ${
                                                isProcessingVoice
                                                    ? "bg-primary/50"
                                                    : "bg-primary"
                                            }`}>
                                            {isProcessingVoice ? (
                                                <Flow
                                                    size={22}
                                                    color="white"
                                                />
                                            ) : (
                                                <Icon
                                                    name="Mic"
                                                    size={16}
                                                    color="white"
                                                />
                                            )}
                                            <Text className="text-sm font-semibold text-white">
                                                {isProcessingVoice
                                                    ? "AI Working..."
                                                    : "Listen Again"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </>
    );
}
