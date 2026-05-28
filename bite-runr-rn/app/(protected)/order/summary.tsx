import { router, useLocalSearchParams } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import ActionSheet, { type ActionSheetRef } from "react-native-actions-sheet";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { useReceiptScanning } from "@/hooks/useReceiptScanning";
import { useManualPriceEntry } from "@/hooks/useManualPriceEntry";
import {
  type RawOrderSummaryData,
  useAiOrderSummary,
} from "@/hooks/useAiOrderSummary";
import { ReceiptConfirmationSheet } from "@/components/receipt-confirmation-sheet";
import { ManualPriceEntrySheet } from "@/components/manual-price-entry-sheet";
import Animated, {
  cancelAnimation,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  groupOrderItemsByParticipant,
  materializeResolvedOrderItemTextGroups,
} from "@/lib/order-item-grouping";

type GroupMode = "items" | "people";
type SummaryAiHint = "cached" | "generate" | null;
type SummaryLocation = RawOrderSummaryData["locations"][number];

// ── Shared header shell ───────────────────────────────────────────

function SummaryShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-[#FFF7EE]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 px-[18px] pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText weight="bold" className="text-[17px]">
          {title}
        </BrText>
        <View className="w-[38px]" />
      </View>
      {children}
    </View>
  );
}

// ── AI loading screen ─────────────────────────────────────────────

function SummaryAiLoadingScreen() {
  return (
    <SummaryShell title="Order Summary">
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full items-center rounded-[28px] border border-[rgba(26,20,16,0.08)] bg-white p-7">
          <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-[#FFF1E2]">
            <Icon name="ClipboardList" size={28} color={BR.orange} />
          </View>
          <BrText weight="bold" className="mt-4 text-center text-[22px]">
            Summarizing order
          </BrText>
          <Text className="mt-2 text-center text-[13px] leading-[19px] text-[#8A7A6E]">
            Grouping similar items across all pickup spots…
          </Text>
          <View className="mt-[18px] flex-row items-center gap-2">
            <ActivityIndicator size="small" color={BR.orange} />
            <Text
              className="text-[13px] text-[#FF6A1F]"
              style={BR_FONT_STYLE.displaySemibold}
            >
              This only takes a moment
            </Text>
          </View>
        </View>
      </View>
    </SummaryShell>
  );
}

// ── Data loading skeleton ─────────────────────────────────────────

function SummaryDataLoadingScreen() {
  return (
    <SummaryShell title="Order Summary">
      <Skeleton>
        <View className="gap-3.5 p-[18px]">
          <SkeletonBlock width="100%" height={44} rounded="rounded-2xl" />
          <View className="flex-row gap-2">
            <SkeletonBlock width={90} height={32} rounded="rounded-full" />
            <SkeletonBlock width={110} height={32} rounded="rounded-full" />
          </View>
          {[1, 2, 3].map((i) => (
            <SkeletonBlock
              key={i}
              width="100%"
              height={64}
              rounded="rounded-2xl"
            />
          ))}
        </View>
      </Skeleton>
    </SummaryShell>
  );
}

// ── Scanning overlay ──────────────────────────────────────────────

function CornerBracket({
  corner,
  color,
}: {
  corner: "tl" | "tr" | "bl" | "br";
  color: string;
}) {
  const isTop = corner[0] === "t";
  const isLeft = corner[1] === "l";
  return (
    <View
      className={`absolute h-[72px] w-[72px] ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"}`}
    >
      {/* Horizontal arm */}
      <View
        className={`absolute h-[3px] w-[72px] ${isTop ? "top-0" : "bottom-0"}`}
        style={{ backgroundColor: color }}
      />
      {/* Vertical arm */}
      <View
        className={`absolute top-0 h-[72px] w-[3px] ${isLeft ? "left-0" : "right-0"}`}
        style={{ backgroundColor: color }}
      />
    </View>
  );
}

function ScanningOverlay({
  photoUri,
  scanState,
  error,
  onRetry,
  onDismiss,
}: {
  photoUri: string | null;
  scanState: string;
  error: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const viewportHeight = useSharedValue(0);
  const scanY = useSharedValue(0);

  useEffect(() => {
    return () => {
      cancelAnimation(scanY);
    };
  }, [scanY]);

  const startScanBeam = (height: number) => {
    if (height <= 0 || viewportHeight.value === height) return;
    viewportHeight.value = height;
    cancelAnimation(scanY);
    scanY.value = 0;
    scanY.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  };

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * viewportHeight.value }],
  }));

  const isUploading = scanState === "uploading";
  const isError = scanState === "error";
  const accentColor = isError ? BR.coral : BR.orange;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center gap-5 bg-[#111] px-5"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Status pill */}
        <View
          className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
          style={{ backgroundColor: isError ? BR.coral : BR.orange }}
        >
          {isError ? (
            <Icon name="CircleAlert" size={13} color="#fff" />
          ) : (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ transform: [{ scale: 0.75 }] }}
            />
          )}
          <Text
            className="text-[13px] tracking-[0.3px] text-white"
            style={BR_FONT_STYLE.display}
          >
            {isError
              ? "Scan failed"
              : isUploading
                ? "Uploading…"
                : "AI is reading…"}
          </Text>
        </View>

        {/* Viewport — brackets + photo + beam */}
        <View
          className="relative w-full flex-1"
          onLayout={(e) => startScanBeam(e.nativeEvent.layout.height)}
        >
          {/* Photo (inner, clipped) */}
          <View
            className={`absolute inset-[3px] overflow-hidden rounded bg-[rgba(255,255,255,0.04)] ${isError ? "opacity-50" : ""}`}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="absolute inset-0 items-center justify-center">
                <Icon
                  name="ScanLine"
                  size={48}
                  color="rgba(255,255,255,0.15)"
                />
              </View>
            )}
            {/* Subtle dark overlay */}
            <View className="absolute inset-0 bg-[rgba(0,0,0,0.28)]" />
          </View>

          {/* Corner brackets sit on top, outside the photo's clip */}
          <CornerBracket corner="tl" color={accentColor} />
          <CornerBracket corner="tr" color={accentColor} />
          <CornerBracket corner="bl" color={accentColor} />
          <CornerBracket corner="br" color={accentColor} />

          {/* Scanning beam */}
          {!isUploading && !isError && (
            <Animated.View
              className="absolute left-0 right-0 top-0 h-[3px]"
              style={beamStyle}
              pointerEvents="none"
            >
              <View
                className="h-[3px] bg-[#FF6A1F]"
                style={{
                  shadowColor: BR.orange,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              />
            </Animated.View>
          )}

          {/* Error X */}
          {isError && (
            <View className="absolute inset-0" pointerEvents="none">
              <View className="flex-1 items-center justify-center">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-[rgba(255,77,109,0.9)]">
                  <Icon name="X" size={34} color="#fff" strokeWidth={2.5} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bottom card */}
        <View className="w-full rounded-2xl bg-[rgba(255,255,255,0.07)] p-[18px]">
          {isError ? (
            <>
              <Text className="text-center text-[13px] leading-[19px] text-[rgba(255,255,255,0.75)]">
                {error ?? "Something went wrong reading the receipt."}
              </Text>
              <View className="mt-3.5 flex-row gap-2.5">
                <TouchableOpacity
                  onPress={onRetry}
                  className="flex-1 flex-row items-center justify-center gap-[7px] rounded-xl bg-[#FF6A1F] py-3.5"
                  activeOpacity={0.85}
                >
                  <Icon name="RotateCcw" size={15} color="#fff" />
                  <Text
                    className="text-sm text-white"
                    style={BR_FONT_STYLE.display}
                  >
                    Try again
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onDismiss}
                  className="flex-1 flex-row items-center justify-center gap-[7px] rounded-xl bg-[rgba(255,255,255,0.1)] py-3.5"
                  activeOpacity={0.85}
                >
                  <Text className="text-sm text-[rgba(255,255,255,0.6)]">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text
              className="text-center text-[13px] leading-[19px] text-[rgba(255,255,255,0.5)]"
              style={BR_FONT_STYLE.mono}
            >
              {isUploading
                ? "Compressing and sending to our servers…"
                : "Matching receipt lines to your run's items…"}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export default function OrderSummary() {
  const params = useLocalSearchParams<{ orderId?: string; aiHint?: string }>();
  const orderId = params.orderId ? (params.orderId as Id<"orders">) : null;
  const aiHint: SummaryAiHint =
    params.aiHint === "cached"
      ? "cached"
      : params.aiHint === "generate"
        ? "generate"
        : null;

  const insets = useSafeAreaInsets();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [groupMode, setGroupMode] = useState<GroupMode>("items");
  const sourceActionSheetRef = useRef<ActionSheetRef>(null);

  const summary = useQuery(
    api.orderItems.getOrderSummary,
    orderId ? { orderId } : "skip",
  ) as RawOrderSummaryData | null | undefined;

  const {
    status: aiSummaryStatus,
    aiSummary,
    retry: retryAiSummary,
    error: aiSummaryError,
  } = useAiOrderSummary(orderId, summary);

  const selectedLocation =
    summary?.locations.find((l) => l.orderLocationId === selectedLocationId) ??
    summary?.locations[0] ??
    null;

  const {
    state: scanState,
    error: scanError,
    matchedItems,
    receiptStoreName,
    receiptTotal,
    photoUri,
    startScan,
    updateMatch,
    confirmMatches,
    dismissScan,
    hasDraft: hasScanDraft,
    resumeDraft,
    reset: resetScan,
  } = useReceiptScanning(
    selectedLocation?.orderLocationId as Id<"orderLocations"> | null,
    orderId,
  );

  const {
    state: manualState,
    error: manualError,
    prices: manualPrices,
    orderItems: manualOrderItems,
    startManualEntry,
    updatePrice,
    saveAll: saveManualPrices,
    dismiss: dismissManual,
    reset: resetManual,
  } = useManualPriceEntry(
    selectedLocation?.orderLocationId as Id<"orderLocations"> | null,
    orderId,
  );

  const orderItems = useQuery(
    api.receiptScanning.getOrderItemsForLocation,
    selectedLocation?.orderLocationId
      ? {
          orderLocationId:
            selectedLocation.orderLocationId as Id<"orderLocations">,
        }
      : "skip",
  );

  useEffect(() => {
    if (scanState !== "success") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({
      type: "success",
      text1: "Receipt prices saved",
      visibilityTime: 2500,
    });
    const t = setTimeout(() => resetScan(), 0);
    return () => clearTimeout(t);
  }, [resetScan, scanState]);

  useEffect(() => {
    if (manualState !== "success") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({
      type: "success",
      text1: "Prices saved",
      visibilityTime: 2500,
    });
    const t = setTimeout(() => resetManual(), 0);
    return () => clearTimeout(t);
  }, [manualState, resetManual]);

  const currentLocationSummary = summary?.locationSummaries.find(
    (ls) => ls.orderLocationId === selectedLocation?.orderLocationId,
  );
  const currentLocationLines = currentLocationSummary?.lines ?? [];

  const participantGroups = useMemo(
    () => groupOrderItemsByParticipant(currentLocationLines),
    [currentLocationLines],
  );
  const currentAiLocationSummary = useMemo(
    () =>
      aiSummary?.locations.find(
        (l) => l.orderLocationId === selectedLocation?.orderLocationId,
      ) ?? null,
    [aiSummary, selectedLocation?.orderLocationId],
  );
  const itemGroups = useMemo(
    () =>
      materializeResolvedOrderItemTextGroups(
        currentLocationLines,
        currentAiLocationSummary?.groups,
      ),
    [currentAiLocationSummary?.groups, currentLocationLines],
  );
  const isUsingLocalSummaryFallback = aiSummaryStatus === "ai-error";

  if (summary === undefined) {
    return aiHint === "generate" ? (
      <SummaryAiLoadingScreen />
    ) : (
      <SummaryDataLoadingScreen />
    );
  }
  if (summary === null) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF7EE]">
        <BrText className="text-[#B82340]">
          Not authorized to view this summary
        </BrText>
      </View>
    );
  }
  if (aiSummaryStatus === "loading-data") return <SummaryDataLoadingScreen />;
  if (aiSummaryStatus === "summarizing") return <SummaryAiLoadingScreen />;
  if (!aiSummary && !isUsingLocalSummaryFallback)
    return <SummaryDataLoadingScreen />;

  const isScanning = scanState === "uploading" || scanState === "parsing";
  const allLocationsPriced = summary.locationSummaries.every(
    (ls) => ls.subtotalInCents !== null,
  );
  const locationsWithPrices = summary.locationSummaries.filter(
    (ls) => ls.subtotalInCents !== null,
  );
  const locationsMissingPrices = summary.locationSummaries.filter(
    (ls) => ls.subtotalInCents === null,
  );
  const someLocationsPriced =
    locationsWithPrices.length > 0 && locationsMissingPrices.length > 0;

  return (
    <>
      {(isScanning || scanState === "error") && (
        <ScanningOverlay
          photoUri={photoUri}
          scanState={scanState}
          error={scanError}
          onRetry={() => {
            resetScan();
            sourceActionSheetRef.current?.show();
          }}
          onDismiss={resetScan}
        />
      )}
      <SafeAreaView edges={["top"]} className="bg-[#FFF7EE]" />
      <View className="flex-1 bg-[#FFF7EE]">
        {/* Header */}
        <View className="flex-row items-center gap-2 px-[18px] pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
          <BrText
            weight="bold"
            className="mx-2 flex-1 text-[17px]"
            numberOfLines={1}
            style={BR_FONT_STYLE.display}
          >
            {summary.order.name || "Order Summary"}
          </BrText>
          {/* Group mode toggle */}
          <View className="flex-row gap-0.5 rounded-full bg-[#FCEFE0] p-[3px]">
            {(["items", "people"] as GroupMode[]).map((mode) => {
              const active = groupMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setGroupMode(mode)}
                  className="rounded-full px-3 py-1.5"
                  style={
                    active
                      ? {
                          backgroundColor: BR.card,
                          shadowColor: BR.ink,
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 2,
                          elevation: 1,
                        }
                      : undefined
                  }
                >
                  <Text
                    className={`text-xs ${active ? "text-[#1A1410]" : "text-[#8A7A6E]"}`}
                    style={BR_FONT_STYLE.displaySemibold}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Stats + location chips */}
        <View className="border-b border-[rgba(26,20,16,0.08)] px-[18px] pb-3">
          <Text
            className="text-xs tracking-[0.3px] text-[#8A7A6E]"
            style={BR_FONT_STYLE.mono}
          >
            {summary.totalPeople}{" "}
            {summary.totalPeople === 1 ? "person" : "people"} ·{" "}
            {summary.totalItems} {summary.totalItems === 1 ? "item" : "items"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 pt-2.5"
          >
            {summary.locations.map((location: SummaryLocation) => {
              const locationSummary = summary.locationSummaries.find(
                (ls) => ls.orderLocationId === location.orderLocationId,
              );
              const isSelected =
                selectedLocation?.orderLocationId === location.orderLocationId;
              const hasPrices = locationSummary?.subtotalInCents !== null;
              return (
                <Pressable
                  key={location.orderLocationId}
                  onPress={() =>
                    setSelectedLocationId(location.orderLocationId)
                  }
                  className={`flex-row items-center gap-[5px] rounded-full border px-3.5 py-2 ${
                    isSelected
                      ? "border-[#1A1410] bg-[#1A1410]"
                      : "border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
                  }`}
                >
                  {hasPrices && (
                    <Icon
                      name="CircleCheck"
                      size={13}
                      color={isSelected ? "#fff" : BR.mint}
                    />
                  )}
                  <Text
                    className={`text-[13px] ${isSelected ? "text-white" : "text-[#4A3C32]"}`}
                    style={BR_FONT_STYLE.display}
                  >
                    {location.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Error + warning banners */}
        {manualState === "error" && manualError && (
          <View className="mx-[18px] mt-3 flex-row items-center gap-2.5 rounded-[10px] bg-[#FFE0E6] px-3.5 py-2.5">
            <Icon name="CircleAlert" size={16} color={BR.coralInk} />
            <Text className="flex-1 text-[13px] leading-[18px] text-[#B82340]">
              {manualError}
            </Text>
            <Pressable onPress={resetManual}>
              <Icon name="X" size={16} color={BR.coralInk} />
            </Pressable>
          </View>
        )}

        {isUsingLocalSummaryFallback && (
          <View className="mx-[18px] mt-3 flex-row items-center gap-2.5 rounded-[10px] bg-[#FFF1C4] px-3.5 py-2.5">
            <Icon name="CircleAlert" size={16} color="#7A4A20" />
            <Text className="flex-1 text-[13px] leading-[18px] text-[#7A4A20]">
              {aiSummaryError ??
                "AI grouping is unavailable. Showing a local summary."}
            </Text>
            <Pressable
              onPress={retryAiSummary}
              className="rounded-full bg-[#FFC542] px-2.5 py-1"
            >
              <Text
                className="text-[11px] text-white"
                style={BR_FONT_STYLE.display}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {someLocationsPriced && (
          <Pressable
            onPress={() => {
              const nextUnpriced = summary.locations.find((location) =>
                locationsMissingPrices.some(
                  (ls) => ls.orderLocationId === location.orderLocationId,
                ),
              );
              if (nextUnpriced)
                setSelectedLocationId(nextUnpriced.orderLocationId);
            }}
            className="mx-[18px] mt-3 flex-row items-center gap-2.5 rounded-[10px] bg-[#FFF1C4] px-3.5 py-2.5"
          >
            <Icon name="CircleAlert" size={16} color="#7A4A20" />
            <Text className="flex-1 text-[13px] leading-[18px] text-[#7A4A20]">
              {locationsMissingPrices.length === 1
                ? `Still need prices for ${summary.locations.find((l) => l.orderLocationId === locationsMissingPrices[0].orderLocationId)?.name ?? "1 location"}`
                : `Still need prices for ${locationsMissingPrices.length} locations`}
            </Text>
            <Icon name="ChevronRight" size={16} color="#7A4A20" />
          </Pressable>
        )}

        {/* Items list */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-2.5 p-[18px] pb-8"
          showsVerticalScrollIndicator={false}
        >
          {currentLocationSummary && currentLocationLines.length > 0 ? (
            <>
              <View className="mb-1 flex-row items-center gap-2">
                <Text
                  className="text-[11px] uppercase tracking-[1.2px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  Order items
                </Text>
                <View className="rounded-full bg-[#FCEFE0] px-2 py-0.5">
                  <Text
                    className="text-[11px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.monoBold}
                  >
                    {currentLocationSummary.itemCount}
                  </Text>
                </View>
              </View>

              {groupMode === "items"
                ? itemGroups.map((group, i) => (
                    <Animated.View
                      key={group.key}
                      entering={FadeInUp.duration(200).delay(i * 30)}
                    >
                      <View className="flex-row items-center justify-between rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5">
                        <Text
                          className="mr-2.5 flex-1 text-sm text-[#1A1410]"
                          style={BR_FONT_STYLE.displaySemibold}
                        >
                          {group.displayName}
                        </Text>
                        <View className="rounded-full bg-[#FFE7D4] px-2.5 py-1">
                          <Text
                            className="text-xs text-[#E8551A]"
                            style={BR_FONT_STYLE.monoBold}
                          >
                            {group.lineCount}
                          </Text>
                        </View>
                      </View>
                    </Animated.View>
                  ))
                : participantGroups.map((group, gi) => (
                    <Animated.View
                      key={group.key}
                      entering={FadeInUp.duration(200).delay(gi * 30)}
                    >
                      <View className="rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5">
                        <Text
                          className="text-sm text-[#1A1410]"
                          style={BR_FONT_STYLE.display}
                        >
                          {group.baseName}
                        </Text>
                        <View className="mt-2.5 gap-1.5">
                          {group.items.map((line) => (
                            <View
                              key={line.id}
                              className="flex-row items-start justify-between"
                            >
                              <Text className="mr-2 flex-1 text-[13px] text-[#4A3C32]">
                                {line.text}
                              </Text>
                              {line.priceInCents !== null && (
                                <Text
                                  className="text-[13px] text-[#8A7A6E]"
                                  style={BR_FONT_STYLE.mono}
                                >
                                  ${(line.priceInCents / 100).toFixed(2)}
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    </Animated.View>
                  ))}

              {/* Price summary */}
              {currentLocationSummary.subtotalInCents !== null && (
                <>
                  <Text
                    className="mt-2 text-[11px] uppercase tracking-[1.2px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    Price summary
                  </Text>
                  <View className="gap-2 rounded-2xl border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2] p-3.5">
                    <View className="flex-row justify-between">
                      <Text
                        className="text-[13px] text-[#8A7A6E]"
                        style={BR_FONT_STYLE.mono}
                      >
                        Subtotal
                      </Text>
                      <Text
                        className="text-[13px] text-[#1A1410]"
                        style={BR_FONT_STYLE.mono}
                      >
                        $
                        {(currentLocationSummary.subtotalInCents / 100).toFixed(
                          2,
                        )}
                      </Text>
                    </View>
                    {currentLocationSummary.taxInCents !== null && (
                      <View className="flex-row justify-between">
                        <Text
                          className="text-[13px] text-[#8A7A6E]"
                          style={BR_FONT_STYLE.mono}
                        >
                          Tax
                        </Text>
                        <Text
                          className="text-[13px] text-[#1A1410]"
                          style={BR_FONT_STYLE.mono}
                        >
                          $
                          {(currentLocationSummary.taxInCents / 100).toFixed(2)}
                        </Text>
                      </View>
                    )}
                    {currentLocationSummary.totalInCents !== null && (
                      <View className="mt-1 flex-row justify-between border-t border-[rgba(255,106,31,0.2)] pt-2.5">
                        <Text
                          className="text-[15px] text-[#1A1410]"
                          style={BR_FONT_STYLE.display}
                        >
                          Total
                        </Text>
                        <Text
                          className="text-[17px] text-[#FF6A1F]"
                          style={BR_FONT_STYLE.monoBold}
                        >
                          $
                          {(currentLocationSummary.totalInCents / 100).toFixed(
                            2,
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </>
          ) : (
            <View className="items-center pt-12">
              <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-[#FCEFE0]">
                <Icon name="ShoppingBag" size={26} color={BR.ink3} />
              </View>
              <Text className="mt-3 text-sm text-[#8A7A6E]">
                No items from this location yet
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer CTA */}
        <View
          className="border-t border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-[18px] pt-3.5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          {isScanning ? (
            <View className="flex-row items-center justify-center gap-2 rounded-2xl border border-[rgba(255,106,31,0.25)] bg-[#FFE7D4] py-4">
              <ActivityIndicator size="small" color={BR.orange} />
              <Text
                className="text-base text-[#E8551A]"
                style={BR_FONT_STYLE.display}
              >
                {scanState === "uploading"
                  ? "Sending your photo…"
                  : "Reading your receipt…"}
              </Text>
            </View>
          ) : hasScanDraft ? (
            <TouchableOpacity
              onPress={resumeDraft}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4"
              activeOpacity={0.85}
            >
              <Icon name="ScanLine" size={18} color="#fff" />
              <Text
                className="text-base text-white"
                style={BR_FONT_STYLE.display}
              >
                Continue receipt review
              </Text>
            </TouchableOpacity>
          ) : allLocationsPriced ? (
            <View className="gap-2.5">
              <TouchableOpacity
                onPress={() =>
                  router.push(`/order/settlement?orderId=${orderId}` as never)
                }
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#2EBE7B] py-4"
                activeOpacity={0.85}
              >
                <Icon name="Receipt" size={18} color="#fff" />
                <Text
                  className="text-base text-white"
                  style={BR_FONT_STYLE.display}
                >
                  View settlement
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => sourceActionSheetRef.current?.show()}
                className="items-center py-2"
              >
                <Text
                  className="text-[13px] text-[#E8551A]"
                  style={BR_FONT_STYLE.displaySemibold}
                >
                  Edit prices
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => sourceActionSheetRef.current?.show()}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4"
              activeOpacity={0.85}
            >
              <Icon name="ScanLine" size={18} color="#fff" />
              <Text
                className="text-base text-white"
                style={BR_FONT_STYLE.display}
              >
                Add prices
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Source picker sheet */}
      <ActionSheet
        ref={sourceActionSheetRef}
        gestureEnabled
        indicatorStyle={{ width: 48, height: 5, backgroundColor: BR.line2 }}
        containerStyle={{
          backgroundColor: BR.paper,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 24,
        }}
      >
        <View className="px-[18px] pt-2">
          <BrText weight="bold" className="text-center text-[20px]">
            Add prices
          </BrText>
          <Text className="mb-[18px] mt-1 text-center text-[13px] text-[#8A7A6E]">
            Scan a receipt or enter prices by hand
          </Text>

          {[
            {
              icon: "Camera" as const,
              title: "Take photo",
              sub: "Use your camera to capture the receipt",
              onPress: () => {
                sourceActionSheetRef.current?.hide();
                void startScan("camera");
              },
            },
            {
              icon: "Image" as const,
              title: "Choose from library",
              sub: "Select an existing photo",
              onPress: () => {
                sourceActionSheetRef.current?.hide();
                void startScan("library");
              },
            },
            {
              icon: "DollarSign" as const,
              title: "Enter manually",
              sub: "Type in prices for each order line",
              onPress: () => {
                sourceActionSheetRef.current?.hide();
                setTimeout(() => startManualEntry(), 400);
              },
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={item.onPress}
              className="mb-2.5 flex-row items-center gap-3.5 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5"
              activeOpacity={0.8}
            >
              <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#FFF1E2]">
                <Icon name={item.icon} size={20} color={BR.orangeDeep} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[15px] text-[#1A1410]"
                  style={BR_FONT_STYLE.display}
                >
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-xs text-[#8A7A6E]">
                  {item.sub}
                </Text>
              </View>
              <Icon name="ChevronRight" size={16} color={BR.ink3} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => sourceActionSheetRef.current?.hide()}
            className="mt-2 flex-row items-center justify-center rounded-2xl border border-[rgba(26,20,16,0.14)] bg-[#FCEFE0] py-4"
            activeOpacity={0.85}
          >
            <Text
              className="text-base text-[#1A1410]"
              style={BR_FONT_STYLE.display}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>

      <ReceiptConfirmationSheet
        visible={scanState === "confirming" || scanState === "saving"}
        onClose={dismissScan}
        onConfirm={() => void confirmMatches()}
        matchedItems={matchedItems}
        orderItems={orderItems}
        onUpdateMatch={updateMatch}
        receiptStoreName={receiptStoreName}
        receiptTotal={receiptTotal}
        isSaving={scanState === "saving"}
      />

      <ManualPriceEntrySheet
        visible={manualState === "entering" || manualState === "saving"}
        onDismiss={dismissManual}
        onSave={() => void saveManualPrices()}
        orderItems={manualOrderItems}
        prices={manualPrices}
        onUpdatePrice={updatePrice}
        locationName={selectedLocation?.name ?? "Store"}
        isSaving={manualState === "saving"}
      />
    </>
  );
}
