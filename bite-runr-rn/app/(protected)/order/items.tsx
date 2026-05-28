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
  withDelay,
} from "react-native-reanimated";
import { Flow } from "react-native-animated-spinkit";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrText } from "@/components/br";
import { BR, BR_FONT_STYLE, BR_SHADOW } from "@/lib/br-theme";

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
      pairs.forEach(([sv, ov], i) => {
        const delay = i * 866;
        sv.value = 0.6;
        ov.value = 0.28;
        sv.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1.65, {
                duration: 2600,
                easing: Easing.out(Easing.ease),
              }),
              withTiming(0.6, { duration: 0 }),
            ),
            -1,
            false,
          ),
        );
        ov.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(0, { duration: 2600 }),
              withTiming(0.28, { duration: 0 }),
            ),
            -1,
            false,
          ),
        );
      });
      return () => {
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
    return () => {
      cancelAnimation(coreScale);
    };
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
    <View className="h-60 w-60 items-center justify-center">
      <Animated.View
        className="absolute h-60 w-60 rounded-full bg-[#FF6A1F]"
        style={r3Style}
      />
      <Animated.View
        className="absolute h-60 w-60 rounded-full bg-[#FF6A1F]"
        style={r2Style}
      />
      <Animated.View
        className="absolute h-60 w-60 rounded-full bg-[#FF6A1F]"
        style={r1Style}
      />
      <Animated.View style={coreStyle}>
        <View
          className="h-[130px] w-[130px] items-center justify-center rounded-full bg-[#FF6A1F]"
          style={BR_SHADOW.primary}
        >
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
  const teeth = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => `${position}-tooth-${index}`),
    [count, position],
  );
  return (
    <View
      className="flex-row overflow-hidden bg-[#FFF7EE]"
      style={{ height: TOOTH_H }}
    >
      {teeth.map((toothKey) => (
        <View
          key={toothKey}
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
  }, [selectedLocation?.id, locationEntries, selectedLocation]);

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
      <View className="flex-1 items-center justify-center bg-[#FFF7EE]">
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
      <SafeAreaView edges={["top"]} className="bg-[#FFF7EE]" />

      {/* Header */}
      <View className="flex-row items-center justify-between bg-[#FFF7EE] px-[18px] pb-3 pt-2">
        <Pressable
          onPress={() => {
            if (isCompletingOrder) return;
            router.back();
          }}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText
          weight="bold"
          className="text-[17px]"
          style={BR_FONT_STYLE.display}
        >
          Your order
        </BrText>
        {totalItems > 0 ? (
          <View className="rounded-full bg-[#FF6A1F] px-2.5 py-[5px]">
            <Text
              className="text-[11px] text-white"
              style={BR_FONT_STYLE.monoBold}
            >
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </Text>
          </View>
        ) : (
          <View className="w-[72px]" />
        )}
      </View>

      <View className="flex-1 bg-[#FFF7EE]">
        {/* Save error banner */}
        {saveError && (
          <View className="mx-[18px] mt-2.5 flex-row items-center gap-2.5 rounded-2xl bg-[#FFE0E6] p-3">
            <Icon name="CircleAlert" size={16} color={BR.coralInk} />
            <Text className="flex-1 text-[13px] text-[#B82340]">
              {saveError}
            </Text>
            <Pressable onPress={() => setSaveError(null)} hitSlop={8}>
              <Icon name="X" size={14} color={BR.coralInk} />
            </Pressable>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-[18px] pb-12 pt-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Animated.View entering={FadeInUp.duration(300)} className="px-0.5">
              <Text
                className="text-[30px] leading-9 text-[#1A1410]"
                style={BR_FONT_STYLE.displayExtraBold}
              >
                {"What can "}
                <Text
                  className="italic text-[#FF6A1F]"
                  style={BR_FONT_STYLE.displayExtraBold}
                >
                  the runner
                </Text>
                {"\ngrab you?"}
              </Text>
              <Text
                className="mt-1.5 text-[13px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                {totalLocations === 1
                  ? `From ${selectedLocationName}`
                  : `${totalLocations} stops on this run`}
              </Text>
            </Animated.View>

            {/* Location tabs — only shown when multi-stop */}
            {orderLocations.length > 1 && (
              <Animated.View
                entering={FadeInUp.duration(300).delay(30)}
                className="mt-4"
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 px-0.5 py-0.5"
                >
                  {orderLocations.map((location) => {
                    const isSelected = selectedLocation?.id === location.id;
                    return (
                      <Pressable
                        key={location.id}
                        onPress={() => void handleLocationPress(location.id)}
                        className={`flex-row items-center rounded-full border px-4 py-[9px] ${
                          isSelected
                            ? "border-[#1A1410] bg-[#1A1410]"
                            : "border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
                        }`}
                      >
                        <Text
                          className={`text-[13px] font-semibold ${
                            isSelected ? "text-white" : "text-[#1A1410]"
                          }`}
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
              className="mt-4 rounded-[22px] border border-[rgba(26,20,16,0.08)] bg-white p-3.5"
            >
              <BrText variant="eyebrow" className="mb-2">
                Add an item
              </BrText>

              {/* Input + add button */}
              <View className="flex-row items-center gap-2 rounded-2xl bg-[#FCEFE0] py-1 pl-3 pr-1">
                <TextInput
                  value={itemInput}
                  onChangeText={(text) => {
                    setItemInput(text);
                    if (saveError) setSaveError(null);
                  }}
                  placeholder="e.g. rotisserie chicken"
                  placeholderTextColor={BR.ink3}
                  className="min-h-9 flex-1 px-0 py-2 text-[15px] leading-5 text-[#1A1410]"
                  style={[
                    BR_FONT_STYLE.displayMedium,
                    { textAlignVertical: "center", includeFontPadding: false },
                  ]}
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
                  className={`h-9 flex-row items-center gap-[5px] rounded-[10px] bg-[#FF6A1F] px-3.5 ${!itemInput.trim() ? "opacity-40" : ""}`}
                >
                  <Icon name="Plus" size={14} color="#fff" />
                  <Text className="text-[13px] font-bold text-white">Add</Text>
                </TouchableOpacity>
              </View>

              {/* Or divider */}
              <View className="my-3 flex-row items-center">
                <View className="h-px flex-1 bg-[rgba(26,20,16,0.08)]" />
                <BrText variant="eyebrow" className="px-2.5 text-[#8A7A6E]">
                  or
                </BrText>
                <View className="h-px flex-1 bg-[rgba(26,20,16,0.08)]" />
              </View>

              {/* Dictate */}
              <TouchableOpacity
                onPress={() => void startVoiceOrdering()}
                disabled={isSaving || isCompletingOrder || isProcessingVoice}
                className={`flex-row items-center justify-center gap-2.5 rounded-2xl border border-dashed border-[rgba(255,106,31,0.35)] bg-[#FFF1E2] p-[13px] ${
                  isSaving || isCompletingOrder || isProcessingVoice
                    ? "opacity-50"
                    : ""
                }`}
              >
                <View className="h-7 w-7 items-center justify-center rounded-full bg-[#FF6A1F]">
                  <Icon name="Mic" size={14} color="#fff" />
                </View>
                <Text className="text-sm font-bold text-[#E8551A]">
                  Dictate your order
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Items list */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(80)}
              className="mt-[22px]"
            >
              <View className="mb-2.5 flex-row items-center justify-between">
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
                    <Text
                      className="text-[11px] tracking-[0.5px] text-[#8A7A6E]"
                      style={BR_FONT_STYLE.monoBold}
                    >
                      CLEAR
                    </Text>
                  </Pressable>
                )}
              </View>

              {locationEntries === undefined && selectedLocation ? (
                <View className="items-center justify-center py-12">
                  <ActivityIndicator size="large" color={BR.orange} />
                </View>
              ) : currentItems.length === 0 ? (
                <View className="overflow-hidden rounded-[10px] bg-white">
                  <TornEdge position="top" />
                  <View className="items-center px-7 py-6">
                    <View className="mb-3 h-[60px] w-[60px] items-center justify-center rounded-2xl bg-[#FFF1E2]">
                      <Icon
                        name="UtensilsCrossed"
                        size={28}
                        color={BR.orangeDeep}
                      />
                    </View>
                    <Text
                      className="text-center text-lg italic text-[#E8551A]"
                      style={BR_FONT_STYLE.displayExtraBold}
                    >
                      Nothing on the list yet
                    </Text>
                    <Text
                      className="mt-1.5 text-center text-[10px] tracking-[1.2px] text-[#8A7A6E]"
                      style={BR_FONT_STYLE.mono}
                    >
                      · TYPE OR DICTATE TO BEGIN ·
                    </Text>
                  </View>
                  <TornEdge position="bottom" />
                </View>
              ) : (
                <View className="overflow-hidden rounded-[10px] bg-white">
                  <TornEdge position="top" />
                  <View className="px-4 pb-4 pt-3">
                    <View className="items-center pb-3">
                      <Text
                        className="text-base italic text-[#E8551A]"
                        style={BR_FONT_STYLE.displayExtraBold}
                      >
                        {selectedLocationName}
                      </Text>
                      <Text
                        className="mt-0.5 text-[10px] tracking-wide text-[#8A7A6E]"
                        style={BR_FONT_STYLE.mono}
                      >
                        · {totalItems} ITEM{totalItems === 1 ? "" : "S"} ·
                        RUNNER WILL GRAB ·
                      </Text>
                    </View>
                    <View className="my-3 h-px self-stretch bg-[rgba(26,20,16,0.1)]" />
                    <View className="gap-2 pt-1">
                      {currentItems.map((item, index) => {
                        const occurrence = itemKeyCounts.get(item) ?? 0;
                        itemKeyCounts.set(item, occurrence + 1);
                        return (
                          <View
                            key={`${selectedLocation?.id ?? "loc"}-${item}-${occurrence}`}
                            className="flex-row items-center gap-2.5"
                          >
                            <Text
                              className="w-[18px] text-[10px] text-[#8A7A6E]"
                              style={BR_FONT_STYLE.mono}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </Text>
                            <Text className="flex-1 text-sm font-semibold text-[#1A1410]">
                              {item}
                            </Text>
                            <Pressable
                              onPress={() => removeItem(index)}
                              hitSlop={10}
                              accessibilityRole="button"
                              accessibilityLabel="Remove item"
                              className="h-6 w-6 items-center justify-center rounded-full bg-[#FCEFE0]"
                            >
                              <Icon name="X" size={11} color={BR.ink2} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                    <View className="mb-1.5 mt-3.5 h-px self-stretch bg-[rgba(26,20,16,0.1)]" />
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="text-[11px] text-[#4A3C32]"
                        style={BR_FONT_STYLE.mono}
                      >
                        ITEMS
                      </Text>
                      <Text
                        className="text-[11px] text-[#4A3C32]"
                        style={BR_FONT_STYLE.monoBold}
                      >
                        {totalItems}
                      </Text>
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
          className="border-t border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-[18px] pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <TouchableOpacity
            onPress={finishOrderingAndLeave}
            disabled={isCompletingOrder}
            className={`h-[54px] w-full flex-row items-center justify-center gap-2 rounded-2xl ${
              totalItems === 0
                ? "border border-[rgba(26,20,16,0.14)] bg-[#FCEFE0]"
                : "bg-[#FF6A1F]"
            } ${isCompletingOrder ? "opacity-60" : ""}`}
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
              className={`text-base font-bold ${
                totalItems === 0 ? "text-[#4A3C32]" : "text-white"
              }`}
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
        <View className="flex-1 bg-[#1A1410]">
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-[18px] pb-1"
            style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
          >
            <Pressable
              onPress={() => void closeVoiceModal()}
              className="h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)]"
              accessibilityRole="button"
              accessibilityLabel="Close voice ordering"
            >
              <Icon name="X" size={18} color="#fff" />
            </Pressable>
            <Text
              className="text-[11px] tracking-[1.5px] text-[rgba(255,255,255,0.6)]"
              style={BR_FONT_STYLE.mono}
            >
              {parsedItems.length > 0
                ? "Got it"
                : isListening
                  ? "Listening"
                  : isProcessingVoice
                    ? "Thinking"
                    : "Voice"}
            </Text>
            <View className="w-9" />
          </View>

          {parsedItems.length === 0 ? (
            /* ── Listening / Processing phase ── */
            <View className="flex-1 items-center px-6 pt-12">
              <VoiceRippleOrb
                isListening={isListening}
                isProcessingVoice={isProcessingVoice}
              />

              <View className="mt-11 min-h-[88px] w-full items-center">
                {displayedVoiceTranscript ? (
                  <Text
                    className="text-center text-2xl italic leading-8 text-white"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    {`"${displayedVoiceTranscript}`}
                    {isListening && (
                      <Text
                        className="text-[#FF6A1F]"
                        style={{ opacity: cursorVisible ? 1 : 0 }}
                      >
                        |
                      </Text>
                    )}
                    {`"`}
                  </Text>
                ) : (
                  <Text
                    className="text-center text-2xl italic leading-8 text-[rgba(255,255,255,0.28)]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    {isProcessingVoice
                      ? "Processing your order..."
                      : "Speak naturally..."}
                  </Text>
                )}
                {voiceError ? (
                  <Text
                    className="mt-3.5 text-center text-[13px] leading-[19px] text-[#FF4D6D]"
                    style={BR_FONT_STYLE.mono}
                  >
                    {voiceError}
                  </Text>
                ) : null}
              </View>

              <View className="absolute bottom-12 left-6 right-6 items-center gap-3">
                {isListening ? (
                  <TouchableOpacity
                    onPress={() => void stopVoiceOrdering()}
                    className="flex-row items-center gap-2 rounded-full bg-[rgba(255,255,255,0.12)] px-[22px] py-[13px]"
                  >
                    <Icon
                      name="Square"
                      size={14}
                      color="#fff"
                      strokeWidth={2}
                    />
                    <Text className="text-sm font-semibold tracking-[0.2px] text-white">
                      Tap to stop
                    </Text>
                  </TouchableOpacity>
                ) : isProcessingVoice ? (
                  <View className="items-center gap-2.5">
                    <Flow size={28} color={BR.orange} />
                    <Text
                      className="text-[13px] text-[rgba(255,255,255,0.5)]"
                      style={BR_FONT_STYLE.mono}
                    >
                      AI is parsing your order
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => void startVoiceOrdering()}
                    className="flex-row items-center gap-2 rounded-full bg-[rgba(255,255,255,0.12)] px-[22px] py-[13px]"
                  >
                    <Icon name="Mic" size={16} color="#fff" />
                    <Text className="text-sm font-semibold tracking-[0.2px] text-white">
                      {voiceError ? "Try again" : "Start listening"}
                    </Text>
                  </TouchableOpacity>
                )}
                {!isListening && !isProcessingVoice && !voiceError && (
                  <Text
                    className="text-center text-xs text-[rgba(255,255,255,0.38)]"
                    style={BR_FONT_STYLE.mono}
                  >
                    Speak naturally · one item at a time
                  </Text>
                )}
              </View>
            </View>
          ) : (
            /* ── Parsed phase ── */
            <Animated.View
              entering={FadeInUp.duration(350)}
              className="flex-1 px-[18px] pb-6 pt-5"
            >
              <Text
                className="mb-2 text-[11px] tracking-wide text-[#FF6A1F]"
                style={BR_FONT_STYLE.monoBold}
              >
                ✨ I heard
              </Text>
              <Text
                className="mb-[22px] text-xl italic leading-[27px] text-white"
                style={BR_FONT_STYLE.displayExtraBold}
                numberOfLines={4}
              >
                {`"${displayedVoiceTranscript}"`}
              </Text>

              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerClassName="gap-2.5"
              >
                {parsedItems.map((item, i) => {
                  const parsedItemKey = `${item}-${i}`;
                  return (
                    <Animated.View
                      key={parsedItemKey}
                      entering={FadeInUp.duration(280).delay(i * 70)}
                      className="flex-row items-center gap-3.5 rounded-[18px] bg-[rgba(255,255,255,0.06)] p-3.5"
                    >
                      <View className="h-[38px] w-[38px] items-center justify-center rounded-xl bg-[#FF6A1F]">
                        <Text
                          className="text-[13px] text-white"
                          style={BR_FONT_STYLE.monoBold}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </Text>
                      </View>
                      <Text className="flex-1 text-[15px] font-semibold text-white">
                        {item}
                      </Text>
                    </Animated.View>
                  );
                })}
              </ScrollView>

              <View className="mt-[18px] gap-2.5">
                <TouchableOpacity
                  onPress={confirmVoiceItems}
                  className="h-[54px] w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F]"
                  style={BR_SHADOW.primary}
                >
                  <Icon name="Check" size={16} color="#fff" strokeWidth={2.5} />
                  <Text className="text-base font-bold text-white">
                    Add {parsedItems.length}{" "}
                    {parsedItems.length === 1 ? "item" : "items"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void resetVoice()}
                  className="h-[50px] flex-row items-center justify-center gap-2 rounded-2xl bg-[rgba(255,255,255,0.08)]"
                >
                  <Icon name="RotateCcw" size={14} color="#fff" />
                  <Text className="text-sm font-semibold text-white">
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <SafeAreaView edges={["bottom"]} className="bg-transparent" />
        </View>
      </Modal>
    </>
  );
}
