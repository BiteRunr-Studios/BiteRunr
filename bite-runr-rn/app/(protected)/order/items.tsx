import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import Toast from "react-native-toast-message";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAction, useMutation, useQuery } from "convex/react";
import Animated, {
  Easing,
  FadeInUp,
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
import { BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";

// ─── utilities ────────────────────────────────────────────────────

function normalizeOrderItems(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function areOrderItemsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function normalizeVoiceTranscript(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function mergeVoiceTranscriptSegments(committed: string, incoming: string) {
  const normalizedCommitted = normalizeVoiceTranscript(committed);
  const normalizedIncoming = normalizeVoiceTranscript(incoming);
  if (!normalizedIncoming) return normalizedCommitted;
  if (!normalizedCommitted) return normalizedIncoming;
  if (normalizedIncoming === normalizedCommitted) return normalizedCommitted;
  if (normalizedIncoming.startsWith(normalizedCommitted))
    return normalizedIncoming;
  if (normalizedCommitted.startsWith(normalizedIncoming))
    return normalizedCommitted;
  return normalizeVoiceTranscript(
    `${normalizedCommitted} ${normalizedIncoming}`,
  );
}

function extractSpeechTranscript(event: any) {
  const transcripts: string[] = [];
  const pushTranscript = (value: unknown) => {
    if (typeof value !== "string") return;
    const normalized = normalizeVoiceTranscript(value);
    if (normalized) transcripts.push(normalized);
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

// ─── VoiceRippleOrb ───────────────────────────────────────────────

function VoiceRippleOrb({
  isListening,
  isProcessingVoice,
}: {
  isListening: boolean;
  isProcessingVoice: boolean;
}) {
  const r1s = useSharedValue(0.6);
  const r1o = useSharedValue(0);
  const r2s = useSharedValue(0.6);
  const r2o = useSharedValue(0);
  const r3s = useSharedValue(0.6);
  const r3o = useSharedValue(0);
  const coreScale = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.07, {
            duration: 700,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      const pairs: [typeof r1s, typeof r1o][] = [
        [r1s, r1o],
        [r2s, r2o],
        [r3s, r3o],
      ];
      const timeouts = pairs.map(([sv, ov], i) =>
        setTimeout(() => {
          sv.value = 0.6;
          ov.value = 0.28;
          sv.value = withRepeat(
            withSequence(
              withTiming(1.65, {
                duration: 2600,
                easing: Easing.out(Easing.ease),
              }),
              withTiming(0.6, { duration: 0 }),
            ),
            -1,
            false,
          );
          ov.value = withRepeat(
            withSequence(
              withTiming(0, { duration: 2600 }),
              withTiming(0.28, { duration: 0 }),
            ),
            -1,
            false,
          );
        }, i * 866),
      );
      return () => {
        timeouts.forEach(clearTimeout);
        [r1s, r2s, r3s].forEach((v) => {
          cancelAnimation(v);
          v.value = withTiming(0.6, { duration: 300 });
        });
        [r1o, r2o, r3o].forEach((v) => {
          cancelAnimation(v);
          v.value = withTiming(0, { duration: 300 });
        });
        cancelAnimation(coreScale);
        coreScale.value = withTiming(1, { duration: 300 });
      };
    }
    [r1s, r2s, r3s].forEach((v) => {
      cancelAnimation(v);
      v.value = withTiming(0.6, { duration: 250 });
    });
    [r1o, r2o, r3o].forEach((v) => {
      cancelAnimation(v);
      v.value = withTiming(0, { duration: 250 });
    });
    if (isProcessingVoice) {
      coreScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 650 }),
          withTiming(1, { duration: 650 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(coreScale);
      coreScale.value = withTiming(1, { duration: 250 });
    }
  }, [isListening, isProcessingVoice, r1s, r1o, r2s, r2o, r3s, r3o, coreScale]);

  const r1Style = useAnimatedStyle(() => ({
    transform: [{ scale: r1s.value }],
    opacity: r1o.value,
  }));
  const r2Style = useAnimatedStyle(() => ({
    transform: [{ scale: r2s.value }],
    opacity: r2o.value,
  }));
  const r3Style = useAnimatedStyle(() => ({
    transform: [{ scale: r3s.value }],
    opacity: r3o.value,
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  return (
    <View style={voiceStyles.rippleContainer}>
      <Animated.View style={[voiceStyles.rippleRing, r3Style]} />
      <Animated.View style={[voiceStyles.rippleRing, r2Style]} />
      <Animated.View style={[voiceStyles.rippleRing, r1Style]} />
      <Animated.View style={coreStyle}>
        <View style={voiceStyles.rippleCore}>
          <Icon
            name={isProcessingVoice ? "Sparkles" : "Mic"}
            size={44}
            color="#fff"
            strokeWidth={isProcessingVoice ? 1.8 : 2}
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── TornEdge ─────────────────────────────────────────────────────

const TOOTH_W = 9;
const TOOTH_H = 7;
const CARD_H_PADDING = 36; // 18px each side

function TornEdge({ position }: { position: "top" | "bottom" }) {
  const { width } = useWindowDimensions();
  const count = Math.ceil((width - CARD_H_PADDING) / TOOTH_W) + 2;
  return (
    <View
      style={{
        height: TOOTH_H,
        backgroundColor: BR.paper,
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: TOOTH_W / 2,
            borderRightWidth: TOOTH_W / 2,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            ...(position === "top"
              ? { borderBottomWidth: TOOTH_H, borderBottomColor: BR.card }
              : { borderTopWidth: TOOTH_H, borderTopColor: BR.card }),
          }}
        />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function WriteOrder() {
  const { orderUserId, orderId } = useLocalSearchParams<{
    orderUserId?: string;
    orderId?: string;
  }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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
  const [displayedVoiceTranscript, setDisplayedVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [parsedItems, setParsedItems] = useState<string[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);

  const leaveInFlightRef = useRef(false);
  const skipBeforeRemovePersistRef = useRef(false);
  const isMountedRef = useRef(true);
  const shouldProcessVoiceResultRef = useRef(false);
  const hasProcessedVoiceResultRef = useRef(false);
  const voiceTranscriptRef = useRef("");
  const committedVoiceTranscriptRef = useRef("");

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
    if (!orderLocations || orderLocations.length === 0) return null;
    return (
      orderLocations.find((location) => location.id === selectedLocationId) ??
      orderLocations[0]
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
        if (current === voiceTranscript) return current;
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
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [voiceModalVisible, voiceTranscript]);

  useEffect(() => {
    if (!voiceModalVisible || parsedItems.length > 0) return;
    const id = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(id);
  }, [voiceModalVisible, parsedItems.length]);

  useEffect(() => {
    if (!selectedLocation || locationEntries === undefined) return;
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
      if (!selectedLocation || !orderUserId) return;
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
        if (!isMountedRef.current) return;
        if (result.items.length === 0) {
          setVoiceError(
            "We heard you, but couldn't turn that into order items. Try again or type it in.",
          );
          return;
        }
        setParsedItems(result.items);
      } catch (error: any) {
        if (!isMountedRef.current) return;
        setVoiceError(
          error?.message ??
            "We couldn't process your voice order. Please try again.",
        );
      } finally {
        if (isMountedRef.current) setIsProcessingVoice(false);
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
    if (!transcript) return;
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
    shouldProcessVoiceResultRef.current = false;
    hasProcessedVoiceResultRef.current = true;
    committedVoiceTranscriptRef.current = "";
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
      if (!selectedLocation || !orderUserId) return true;
      const normalizedCurrentItems = normalizeOrderItems([
        ...currentItems,
        itemInput,
      ]);
      const normalizedLoadedItems = normalizeOrderItems(loadedItems);
      if (areOrderItemsEqual(normalizedCurrentItems, normalizedLoadedItems))
        return true;
      if (!background && isMountedRef.current) setIsSaving(true);
      if (isMountedRef.current) setSaveError(null);
      try {
        await replaceForUserLocation({
          orderUserId: orderUserId as Id<"orderUsers">,
          orderLocationId: selectedLocation.id as Id<"orderLocations">,
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
          error?.message ?? "We couldn't save your order. Please try again.";
        if (isMountedRef.current) setSaveError(message);
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
        if (!background && isMountedRef.current) setIsSaving(false);
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
      if (!orderId) return false;
      try {
        await setStatus({ orderId: orderId as Id<"orders">, status: "done" });
        return true;
      } catch (error: any) {
        const message =
          error?.message ?? "We couldn't finish your order. Please try again.";
        if (isMountedRef.current) setSaveError(message);
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
    if (leaveInFlightRef.current) return;
    leaveInFlightRef.current = true;
    void (async () => {
      const didSave = await saveCurrentLocation({ background: true });
      if (didSave) await completeOrder({ background: true });
      leaveInFlightRef.current = false;
    })();
  }, [completeOrder, saveCurrentLocation]);

  const finishOrderingAndLeave = useCallback(() => {
    if (isSaving || isCompletingOrder) return;
    void (async () => {
      setIsCompletingOrder(true);
      let didExit = false;
      try {
        const didSave = await saveCurrentLocation();
        if (!didSave) return;
        const didComplete = await completeOrder();
        if (!didComplete) return;
        skipBeforeRemovePersistRef.current = true;
        didExit = true;
        router.dismiss();
      } finally {
        if (!didExit && isMountedRef.current) setIsCompletingOrder(false);
      }
    })();
  }, [completeOrder, isCompletingOrder, isSaving, saveCurrentLocation]);

  const addItem = useCallback(() => {
    const nextItem = itemInput.trim();
    if (!nextItem) return;
    setCurrentItems((prev) => [...prev, nextItem]);
    setItemInput("");
    setSaveError(null);
  }, [itemInput]);

  const removeItem = useCallback((itemIndex: number) => {
    setCurrentItems((prev) => prev.filter((_, index) => index !== itemIndex));
    setSaveError(null);
  }, []);

  const handleLocationPress = useCallback(
    async (nextLocationId: string) => {
      if (
        selectedLocation?.id === nextLocationId ||
        isSaving ||
        isCompletingOrder
      )
        return;
      const didSave = await saveCurrentLocation();
      if (!didSave) return;
      setCurrentItems([]);
      setLoadedItems([]);
      setItemInput("");
      setSelectedLocationId(nextLocationId);
    },
    [isCompletingOrder, isSaving, saveCurrentLocation, selectedLocation?.id],
  );

  const startVoiceOrdering = useCallback(async () => {
    if (!selectedLocation || !orderUserId) return;
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
    committedVoiceTranscriptRef.current = "";
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
      if (!permissionGranted) throw new Error("permission-denied");
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        addsPunctuation: true,
        continuous: true,
        contextualStrings: currentItems.slice(0, 10),
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 60_000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 15_000,
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

  const closeVoiceModal = useCallback(async () => {
    shouldProcessVoiceResultRef.current = false;
    hasProcessedVoiceResultRef.current = true;
    setVoiceModalVisible(false);
    setVoiceTranscript("");
    setDisplayedVoiceTranscript("");
    voiceTranscriptRef.current = "";
    committedVoiceTranscriptRef.current = "";
    setVoiceError(null);
    setIsProcessingVoice(false);
    setIsListening(false);
    setParsedItems([]);
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}
  }, []);

  const confirmVoiceItems = useCallback(() => {
    const items = parsedItems;
    setCurrentItems(items);
    setParsedItems([]);
    setVoiceTranscript("");
    setDisplayedVoiceTranscript("");
    voiceTranscriptRef.current = "";
    setVoiceModalVisible(false);
    setSaveError(null);
    Toast.show({
      type: "success",
      text1: "Order updated",
      text2: items.join(", "),
      visibilityTime: 3000,
    });
  }, [parsedItems]);

  const resetVoice = useCallback(async () => {
    setParsedItems([]);
    setVoiceTranscript("");
    setDisplayedVoiceTranscript("");
    voiceTranscriptRef.current = "";
    committedVoiceTranscriptRef.current = "";
    setVoiceError(null);
    setIsProcessingVoice(false);
    setIsListening(false);
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}
    await startVoiceOrdering();
  }, [startVoiceOrdering]);

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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BR.paper,
        }}
      >
        <ActivityIndicator size="large" color={BR.orange} />
      </View>
    );
  }

  const itemKeyCounts = new Map<string, number>();
  const selectedLocationName = selectedLocation?.name ?? "Pickup Location";
  const totalLocations = orderLocations.length;
  const totalItems = currentItems.length;

  return (
    <>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BR.paper }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (isCompletingOrder) return;
            router.back();
          }}
          style={styles.backBtn}
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText weight="bold" style={{ fontSize: 17 }}>
          Your order
        </BrText>
        {totalItems > 0 ? (
          <View style={styles.itemCountPill}>
            <Text style={styles.itemCountText}>
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </Text>
          </View>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <View style={{ flex: 1, backgroundColor: BR.paper }}>
        {/* Save error banner */}
        {saveError && (
          <View style={styles.errorBanner}>
            <Icon name="CircleAlert" size={16} color={BR.coralInk} />
            <Text style={styles.errorText}>{saveError}</Text>
            <Pressable onPress={() => setSaveError(null)} hitSlop={8}>
              <Icon name="X" size={14} color={BR.coralInk} />
            </Pressable>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Animated.View
              entering={FadeInUp.duration(300)}
              style={{ paddingHorizontal: 2 }}
            >
              <Text style={styles.titleText}>
                {"What can "}
                <Text style={styles.titleRunner}>the runner</Text>
                {"\ngrab you?"}
              </Text>
              <Text style={styles.titleSub}>
                {totalLocations === 1
                  ? `From ${selectedLocationName}`
                  : `${totalLocations} stops on this run`}
              </Text>
            </Animated.View>

            {/* Location tabs — only shown when multi-stop */}
            {orderLocations.length > 1 && (
              <Animated.View
                entering={FadeInUp.duration(300).delay(30)}
                style={{ marginTop: 16 }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: 8,
                    paddingVertical: 2,
                    paddingHorizontal: 2,
                  }}
                >
                  {orderLocations.map((location) => {
                    const isSelected = selectedLocation?.id === location.id;
                    return (
                      <Pressable
                        key={location.id}
                        onPress={() => void handleLocationPress(location.id)}
                        style={[
                          styles.locationTab,
                          isSelected && styles.locationTabActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.locationTabText,
                            isSelected && styles.locationTabTextActive,
                          ]}
                        >
                          {location.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            )}

            {/* Add card */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(50)}
              style={styles.addCard}
            >
              <BrText variant="eyebrow" style={{ marginBottom: 8 }}>
                Add an item
              </BrText>

              {/* Input + add button */}
              <View style={styles.inputRow}>
                <TextInput
                  value={itemInput}
                  onChangeText={(text) => {
                    setItemInput(text);
                    if (saveError) setSaveError(null);
                  }}
                  placeholder="e.g. rotisserie chicken"
                  placeholderTextColor={BR.ink3}
                  style={styles.textInput}
                  autoCapitalize="none"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => {
                    addItem();
                    Keyboard.dismiss();
                  }}
                  editable={!isSaving && !isCompletingOrder}
                />
                <TouchableOpacity
                  onPress={addItem}
                  disabled={!itemInput.trim() || isSaving || isCompletingOrder}
                  style={[styles.addBtn, !itemInput.trim() && { opacity: 0.4 }]}
                >
                  <Icon name="Plus" size={14} color="#fff" />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Or divider */}
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <BrText
                  variant="eyebrow"
                  style={{ paddingHorizontal: 10, color: BR.ink3 }}
                >
                  or
                </BrText>
                <View style={styles.orLine} />
              </View>

              {/* Dictate */}
              <TouchableOpacity
                onPress={() => void startVoiceOrdering()}
                disabled={isSaving || isCompletingOrder || isProcessingVoice}
                style={[
                  styles.dictateBtn,
                  (isSaving || isCompletingOrder || isProcessingVoice) && {
                    opacity: 0.5,
                  },
                ]}
              >
                <View style={styles.micOrb}>
                  <Icon name="Mic" size={14} color="#fff" />
                </View>
                <Text style={styles.dictateBtnText}>Dictate your order</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Items list */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(80)}
              style={{ marginTop: 22 }}
            >
              <View style={styles.listHeader}>
                <BrText variant="eyebrow">
                  Your list · {selectedLocationName}
                </BrText>
                {currentItems.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setCurrentItems([]);
                      setSaveError(null);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.clearBtn}>CLEAR</Text>
                  </Pressable>
                )}
              </View>

              {locationEntries === undefined && selectedLocation ? (
                <View style={styles.listLoading}>
                  <ActivityIndicator size="large" color={BR.orange} />
                </View>
              ) : currentItems.length === 0 ? (
                <View style={styles.receiptOuter}>
                  <TornEdge position="top" />
                  <View style={styles.emptyCardInner}>
                    <View style={styles.emptyIconWrap}>
                      <Icon
                        name="UtensilsCrossed"
                        size={28}
                        color={BR.orangeDeep}
                      />
                    </View>
                    <Text style={styles.emptyTitle}>
                      Nothing on the list yet
                    </Text>
                    <Text style={styles.emptyMono}>
                      · TYPE OR DICTATE TO BEGIN ·
                    </Text>
                  </View>
                  <TornEdge position="bottom" />
                </View>
              ) : (
                <View style={styles.receiptOuter}>
                  <TornEdge position="top" />
                  <View style={styles.receiptInner}>
                    <View style={{ alignItems: "center", paddingBottom: 12 }}>
                      <Text style={styles.receiptStoreName}>
                        {selectedLocationName}
                      </Text>
                      <Text style={styles.receiptSubtitle}>
                        · {totalItems} ITEM{totalItems === 1 ? "" : "S"} ·
                        RUNNER WILL GRAB ·
                      </Text>
                    </View>
                    <View style={styles.receiptDivider} />
                    <View style={{ gap: 8, paddingTop: 4 }}>
                      {currentItems.map((item, index) => {
                        const occurrence = itemKeyCounts.get(item) ?? 0;
                        itemKeyCounts.set(item, occurrence + 1);
                        return (
                          <View
                            key={`${selectedLocation?.id ?? "loc"}-${item}-${occurrence}`}
                            style={styles.receiptItem}
                          >
                            <Text style={styles.receiptIndex}>
                              {String(index + 1).padStart(2, "0")}
                            </Text>
                            <Text style={styles.receiptItemText}>{item}</Text>
                            <Pressable
                              onPress={() => removeItem(index)}
                              hitSlop={10}
                              accessibilityRole="button"
                              accessibilityLabel="Remove item"
                              style={styles.removeItemBtn}
                            >
                              <Icon name="X" size={11} color={BR.ink2} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                    <View
                      style={[
                        styles.receiptDivider,
                        { marginTop: 14, marginBottom: 6 },
                      ]}
                    />
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>ITEMS</Text>
                      <Text style={styles.subtotalValue}>{totalItems}</Text>
                    </View>
                  </View>
                  <TornEdge position="bottom" />
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            onPress={finishOrderingAndLeave}
            disabled={isCompletingOrder}
            style={[
              styles.doneBtn,
              totalItems === 0 && styles.doneBtnEmpty,
              isCompletingOrder && { opacity: 0.6 },
            ]}
          >
            {isCompletingOrder ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon
                name="Check"
                size={18}
                color={totalItems === 0 ? BR.ink2 : "#fff"}
              />
            )}
            <Text
              style={[
                styles.doneBtnText,
                totalItems === 0 && { color: BR.ink2 },
              ]}
            >
              {isCompletingOrder
                ? "Finishing..."
                : totalItems === 0
                  ? "Add at least one item"
                  : `I'm done · ${totalItems} item${totalItems === 1 ? "" : "s"}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice modal — full-screen dark */}
      <Modal
        visible={voiceModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => void closeVoiceModal()}
      >
        <View style={voiceStyles.screen}>
          {/* Header */}
          <View
            style={[
              voiceStyles.vHeader,
              { paddingTop: Math.max(insets.top, 12) + 8 },
            ]}
          >
            <Pressable
              onPress={() => void closeVoiceModal()}
              style={voiceStyles.vCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close voice ordering"
            >
              <Icon name="X" size={18} color="#fff" />
            </Pressable>
            <Text style={voiceStyles.vStatusLabel}>
              {parsedItems.length > 0
                ? "Got it"
                : isListening
                  ? "Listening"
                  : isProcessingVoice
                    ? "Thinking"
                    : "Voice"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {parsedItems.length === 0 ? (
            /* ── Listening / Processing phase ── */
            <View style={voiceStyles.listeningPhase}>
              <VoiceRippleOrb
                isListening={isListening}
                isProcessingVoice={isProcessingVoice}
              />

              <View style={voiceStyles.vTranscriptWrap}>
                {displayedVoiceTranscript ? (
                  <Text style={voiceStyles.vTranscriptText}>
                    {`"${displayedVoiceTranscript}`}
                    {isListening && (
                      <Text
                        style={{
                          opacity: cursorVisible ? 1 : 0,
                          color: BR.orange,
                        }}
                      >
                        |
                      </Text>
                    )}
                    {`"`}
                  </Text>
                ) : (
                  <Text style={voiceStyles.vTranscriptHint}>
                    {isProcessingVoice
                      ? "Processing your order..."
                      : "Speak naturally..."}
                  </Text>
                )}
                {voiceError ? (
                  <Text style={voiceStyles.vErrorText}>{voiceError}</Text>
                ) : null}
              </View>

              <View style={voiceStyles.vBottomRow}>
                {isListening ? (
                  <TouchableOpacity
                    onPress={() => void stopVoiceOrdering()}
                    style={voiceStyles.vActionBtn}
                  >
                    <Icon
                      name="Square"
                      size={14}
                      color="#fff"
                      strokeWidth={2}
                    />
                    <Text style={voiceStyles.vActionBtnText}>Tap to stop</Text>
                  </TouchableOpacity>
                ) : isProcessingVoice ? (
                  <View style={{ alignItems: "center", gap: 10 }}>
                    <Flow size={28} color={BR.orange} />
                    <Text style={voiceStyles.vProcessingText}>
                      AI is parsing your order
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => void startVoiceOrdering()}
                    style={voiceStyles.vActionBtn}
                  >
                    <Icon name="Mic" size={16} color="#fff" />
                    <Text style={voiceStyles.vActionBtnText}>
                      {voiceError ? "Try again" : "Start listening"}
                    </Text>
                  </TouchableOpacity>
                )}
                {!isListening && !isProcessingVoice && !voiceError && (
                  <Text style={voiceStyles.vHintText}>
                    Speak naturally · one item at a time
                  </Text>
                )}
              </View>
            </View>
          ) : (
            /* ── Parsed phase ── */
            <Animated.View
              entering={FadeInUp.duration(350)}
              style={voiceStyles.parsedPhase}
            >
              <Text style={voiceStyles.parsedEyebrow}>✨ I heard</Text>
              <Text style={voiceStyles.parsedQuote} numberOfLines={4}>
                {`"${displayedVoiceTranscript}"`}
              </Text>

              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {parsedItems.map((item, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInUp.duration(280).delay(i * 70)}
                    style={voiceStyles.parsedItemCard}
                  >
                    <View style={voiceStyles.parsedItemBadge}>
                      <Text style={voiceStyles.parsedItemBadgeText}>
                        {String(i + 1).padStart(2, "0")}
                      </Text>
                    </View>
                    <Text style={voiceStyles.parsedItemText}>{item}</Text>
                  </Animated.View>
                ))}
              </ScrollView>

              <View style={voiceStyles.parsedButtons}>
                <TouchableOpacity
                  onPress={confirmVoiceItems}
                  style={voiceStyles.confirmBtn}
                >
                  <Icon name="Check" size={16} color="#fff" strokeWidth={2.5} />
                  <Text style={voiceStyles.confirmBtnText}>
                    Add {parsedItems.length}{" "}
                    {parsedItems.length === 1 ? "item" : "items"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void resetVoice()}
                  style={voiceStyles.tryAgainBtn}
                >
                  <Icon name="RotateCcw" size={14} color="#fff" />
                  <Text style={voiceStyles.tryAgainText}>Try again</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <SafeAreaView
            edges={["bottom"]}
            style={{ backgroundColor: "transparent" }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: BR.paper,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: BR.orange,
  },
  itemCountText: {
    fontSize: 11,
    fontFamily: BR_FONT.monoBold,
    color: "#fff",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 48,
    paddingTop: 4,
  },
  titleText: {
    fontFamily: BR_FONT.displayExtraBold,
    fontSize: 30,
    color: BR.ink,
    lineHeight: 36,
  },
  titleRunner: {
    color: BR.orange,
    fontStyle: "italic",
    fontFamily: BR_FONT.displayExtraBold,
  },
  titleSub: {
    marginTop: 6,
    fontSize: 13,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  locationTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
  },
  locationTabActive: {
    backgroundColor: BR.ink,
    borderColor: BR.ink,
  },
  locationTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: BR.ink,
  },
  locationTabTextActive: {
    color: "#fff",
  },
  addCard: {
    marginTop: 16,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderColor: BR.line,
    padding: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BR.paper2,
    borderRadius: BR_RADIUS.md,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    fontSize: 15,
    lineHeight: 20,
    color: BR.ink,
    paddingVertical: 8,
    paddingHorizontal: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: BR.orange,
    borderRadius: BR_RADIUS.sm,
    height: 36,
    paddingHorizontal: 14,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: BR.line,
  },
  dictateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 13,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orangeTint,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,106,31,0.35)",
  },
  micOrb: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: BR.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  dictateBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: BR.orangeDeep,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  hintText: {
    fontSize: 11,
    color: BR.ink3,
    flex: 1,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clearBtn: {
    fontSize: 11,
    fontFamily: BR_FONT.monoBold,
    color: BR.ink3,
    letterSpacing: 0.5,
  },
  listLoading: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  receiptOuter: {
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.sm,
    overflow: "hidden",
  },
  emptyCardInner: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orangeTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: BR_FONT.displayExtraBold,
    fontSize: 18,
    fontStyle: "italic",
    color: BR.orangeDeep,
    textAlign: "center",
  },
  emptyMono: {
    fontFamily: BR_FONT.mono,
    fontSize: 10,
    color: BR.ink3,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "rgba(26,20,16,0.1)",
    marginVertical: 12,
    alignSelf: "stretch",
  },
  emptyHint: {
    fontSize: 12,
    color: BR.ink3,
    textAlign: "center",
    fontFamily: BR_FONT.mono,
    lineHeight: 18,
  },
  receiptInner: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },
  receiptStoreName: {
    fontFamily: BR_FONT.displayExtraBold,
    fontSize: 16,
    fontStyle: "italic",
    color: BR.orangeDeep,
  },
  receiptSubtitle: {
    fontFamily: BR_FONT.mono,
    fontSize: 10,
    color: BR.ink3,
    letterSpacing: 1,
    marginTop: 2,
  },
  receiptItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  receiptIndex: {
    fontFamily: BR_FONT.mono,
    fontSize: 10,
    color: BR.ink3,
    width: 18,
  },
  receiptItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: BR.ink,
  },
  removeItemBtn: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    alignItems: "center",
    justifyContent: "center",
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtotalLabel: {
    fontFamily: BR_FONT.mono,
    fontSize: 11,
    color: BR.ink2,
  },
  subtotalValue: {
    fontFamily: BR_FONT.monoBold,
    fontSize: 11,
    color: BR.ink2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 18,
    marginTop: 10,
    padding: 12,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.coralSoft,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: BR.coralInk,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BR.line,
    backgroundColor: BR.paper,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orange,
    width: "100%",
  },
  doneBtnEmpty: {
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line2,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

const voiceStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BR.ink,
  },
  vHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  vCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  vStatusLabel: {
    fontSize: 11,
    fontFamily: BR_FONT.mono,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.6)",
  },
  // ── Listening phase
  listeningPhase: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  rippleContainer: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  rippleRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: BR.orange,
  },
  rippleCore: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: BR.orange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BR.orange,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 16,
  },
  vTranscriptWrap: {
    marginTop: 44,
    width: "100%",
    minHeight: 88,
    alignItems: "center",
  },
  vTranscriptText: {
    fontFamily: BR_FONT.displayExtraBold,
    fontStyle: "italic",
    fontSize: 24,
    lineHeight: 32,
    color: "#fff",
    textAlign: "center",
  },
  vTranscriptHint: {
    fontFamily: BR_FONT.displayExtraBold,
    fontStyle: "italic",
    fontSize: 24,
    lineHeight: 32,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
  },
  vErrorText: {
    marginTop: 14,
    fontSize: 13,
    color: BR.coral,
    textAlign: "center",
    fontFamily: BR_FONT.mono,
    lineHeight: 19,
  },
  vBottomRow: {
    position: "absolute",
    bottom: 48,
    left: 24,
    right: 24,
    alignItems: "center",
    gap: 12,
  },
  vActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  vActionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.2,
  },
  vProcessingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: BR_FONT.mono,
  },
  vHintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    fontFamily: BR_FONT.mono,
    textAlign: "center",
  },
  // ── Parsed phase
  parsedPhase: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
  },
  parsedEyebrow: {
    fontSize: 11,
    fontFamily: BR_FONT.monoBold,
    letterSpacing: 1,
    color: BR.orange,
    marginBottom: 8,
  },
  parsedQuote: {
    fontFamily: BR_FONT.displayExtraBold,
    fontStyle: "italic",
    fontSize: 20,
    lineHeight: 27,
    color: "#fff",
    marginBottom: 22,
  },
  parsedItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
  },
  parsedItemBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BR.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  parsedItemBadgeText: {
    fontFamily: BR_FONT.monoBold,
    fontSize: 13,
    color: "#fff",
  },
  parsedItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  parsedButtons: {
    marginTop: 18,
    gap: 10,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orange,
    shadowColor: BR.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  tryAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: BR_RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tryAgainText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
