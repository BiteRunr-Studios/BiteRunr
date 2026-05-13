import { router, useLocalSearchParams } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
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
    <View
      style={{ flex: 1, backgroundColor: BR.paper, paddingTop: insets.top }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText weight="bold" style={{ fontSize: 17 }}>
          {title}
        </BrText>
        <View style={{ width: 38 }} />
      </View>
      {children}
    </View>
  );
}

// ── AI loading screen ─────────────────────────────────────────────

function SummaryAiLoadingScreen() {
  return (
    <SummaryShell title="Order Summary">
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View style={styles.loadingCard}>
          <View style={styles.loadingIconTile}>
            <Icon name="ClipboardList" size={28} color={BR.orange} />
          </View>
          <BrText
            weight="bold"
            style={{ fontSize: 22, marginTop: 16, textAlign: "center" }}
          >
            Summarizing order
          </BrText>
          <Text style={styles.loadingSubtitle}>
            Grouping similar items across all pickup spots…
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 18,
            }}
          >
            <ActivityIndicator size="small" color={BR.orange} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: BR.orange }}>
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
        <View style={{ padding: 18, gap: 14 }}>
          <SkeletonBlock width="100%" height={44} rounded="rounded-2xl" />
          <View style={{ flexDirection: "row", gap: 8 }}>
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

const BRACKET_SIZE = 72;
const BRACKET_THICKNESS = 3;

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
      style={{
        position: "absolute",
        width: BRACKET_SIZE,
        height: BRACKET_SIZE,
        top: isTop ? 0 : undefined,
        bottom: !isTop ? 0 : undefined,
        left: isLeft ? 0 : undefined,
        right: !isLeft ? 0 : undefined,
      }}
    >
      {/* Horizontal arm */}
      <View
        style={{
          position: "absolute",
          width: BRACKET_SIZE,
          height: BRACKET_THICKNESS,
          backgroundColor: color,
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
        }}
      />
      {/* Vertical arm */}
      <View
        style={{
          position: "absolute",
          width: BRACKET_THICKNESS,
          height: BRACKET_SIZE,
          backgroundColor: color,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
          top: 0,
        }}
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
  const [viewportHeight, setViewportHeight] = useState(0);
  const scanY = useSharedValue(0);

  useEffect(() => {
    if (viewportHeight <= 0) return;
    scanY.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [viewportHeight, scanY]);

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * viewportHeight }],
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
        style={[
          scanStyles.root,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Status pill */}
        <View
          style={[
            scanStyles.statusPill,
            { backgroundColor: isError ? BR.coral : BR.orange },
          ]}
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
          <Text style={scanStyles.statusPillText}>
            {isError
              ? "Scan failed"
              : isUploading
                ? "Uploading…"
                : "AI is reading…"}
          </Text>
        </View>

        {/* Viewport — brackets + photo + beam */}
        <View
          style={scanStyles.viewport}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        >
          {/* Photo (inner, clipped) */}
          <View style={[scanStyles.photoInner, isError && { opacity: 0.5 }]}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: "center", justifyContent: "center" },
                ]}
              >
                <Icon
                  name="ScanLine"
                  size={48}
                  color="rgba(255,255,255,0.15)"
                />
              </View>
            )}
            {/* Subtle dark overlay */}
            <View style={scanStyles.photoOverlay} />
          </View>

          {/* Corner brackets sit on top, outside the photo's clip */}
          <CornerBracket corner="tl" color={accentColor} />
          <CornerBracket corner="tr" color={accentColor} />
          <CornerBracket corner="bl" color={accentColor} />
          <CornerBracket corner="br" color={accentColor} />

          {/* Scanning beam */}
          {!isUploading && !isError && (
            <Animated.View
              style={[scanStyles.beamWrapper, beamStyle]}
              pointerEvents="none"
            >
              <View style={[scanStyles.beam, { shadowColor: BR.orange }]} />
            </Animated.View>
          )}

          {/* Error X */}
          {isError && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View style={scanStyles.errorCircle}>
                  <Icon name="X" size={34} color="#fff" strokeWidth={2.5} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bottom card */}
        <View style={scanStyles.bottomCard}>
          {isError ? (
            <>
              <Text style={scanStyles.errorMessage}>
                {error ?? "Something went wrong reading the receipt."}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  onPress={onRetry}
                  style={[
                    scanStyles.actionBtn,
                    { backgroundColor: BR.orange, flex: 1 },
                  ]}
                  activeOpacity={0.85}
                >
                  <Icon name="RotateCcw" size={15} color="#fff" />
                  <Text style={scanStyles.actionBtnText}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onDismiss}
                  style={[
                    scanStyles.actionBtn,
                    { backgroundColor: "rgba(255,255,255,0.1)", flex: 1 },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      scanStyles.actionBtnText,
                      { color: "rgba(255,255,255,0.6)" },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={scanStyles.bottomHint}>
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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BR.paper,
        }}
      >
        <BrText style={{ color: BR.coralInk }}>
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
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BR.paper }} />
      <View style={{ flex: 1, backgroundColor: BR.paper }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
          <BrText
            weight="bold"
            style={{ fontSize: 17, flex: 1, marginHorizontal: 8 }}
            numberOfLines={1}
          >
            {summary.order.name || "Order Summary"}
          </BrText>
          {/* Group mode toggle */}
          <View style={styles.segmentControl}>
            {(["items", "people"] as GroupMode[]).map((mode) => {
              const active = groupMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setGroupMode(mode)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Stats + location chips */}
        <View
          style={{
            paddingHorizontal: 18,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: BR.line,
          }}
        >
          <Text style={styles.statsLine}>
            {summary.totalPeople}{" "}
            {summary.totalPeople === 1 ? "person" : "people"} ·{" "}
            {summary.totalItems} {summary.totalItems === 1 ? "item" : "items"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingTop: 10 }}
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
                  style={[
                    styles.locationChip,
                    isSelected && styles.locationChipActive,
                  ]}
                >
                  {hasPrices && (
                    <Icon
                      name="CircleCheck"
                      size={13}
                      color={isSelected ? "#fff" : BR.mint}
                    />
                  )}
                  <Text
                    style={[
                      styles.locationChipText,
                      isSelected && styles.locationChipTextActive,
                    ]}
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
          <View style={[styles.banner, { backgroundColor: BR.coralSoft }]}>
            <Icon name="CircleAlert" size={16} color={BR.coralInk} />
            <Text style={[styles.bannerText, { color: BR.coralInk, flex: 1 }]}>
              {manualError}
            </Text>
            <Pressable onPress={resetManual}>
              <Icon name="X" size={16} color={BR.coralInk} />
            </Pressable>
          </View>
        )}

        {isUsingLocalSummaryFallback && (
          <View style={[styles.banner, { backgroundColor: BR.yolkSoft }]}>
            <Icon name="CircleAlert" size={16} color="#7A4A20" />
            <Text style={[styles.bannerText, { color: "#7A4A20", flex: 1 }]}>
              {aiSummaryError ??
                "AI grouping is unavailable. Showing a local summary."}
            </Text>
            <Pressable
              onPress={retryAiSummary}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: BR.yolk,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
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
            style={[styles.banner, { backgroundColor: BR.yolkSoft }]}
          >
            <Icon name="CircleAlert" size={16} color="#7A4A20" />
            <Text style={[styles.bannerText, { color: "#7A4A20", flex: 1 }]}>
              {locationsMissingPrices.length === 1
                ? `Still need prices for ${summary.locations.find((l) => l.orderLocationId === locationsMissingPrices[0].orderLocationId)?.name ?? "1 location"}`
                : `Still need prices for ${locationsMissingPrices.length} locations`}
            </Text>
            <Icon name="ChevronRight" size={16} color="#7A4A20" />
          </Pressable>
        )}

        {/* Items list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, gap: 10, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {currentLocationSummary && currentLocationLines.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Order items</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
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
                      <View style={styles.itemCard}>
                        <Text style={styles.itemName}>{group.displayName}</Text>
                        <View style={styles.itemCountBadge}>
                          <Text style={styles.itemCountText}>
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
                      <View style={styles.personCard}>
                        <Text style={styles.personName}>{group.baseName}</Text>
                        <View style={{ gap: 6, marginTop: 10 }}>
                          {group.items.map((line) => (
                            <View key={line.id} style={styles.personItemRow}>
                              <Text style={styles.personItemText}>
                                {line.text}
                              </Text>
                              {line.priceInCents !== null && (
                                <Text style={styles.personItemPrice}>
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
                  <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
                    Price summary
                  </Text>
                  <View style={styles.priceSummaryCard}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Subtotal</Text>
                      <Text style={styles.priceValue}>
                        $
                        {(currentLocationSummary.subtotalInCents / 100).toFixed(
                          2,
                        )}
                      </Text>
                    </View>
                    {currentLocationSummary.taxInCents !== null && (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Tax</Text>
                        <Text style={styles.priceValue}>
                          $
                          {(currentLocationSummary.taxInCents / 100).toFixed(2)}
                        </Text>
                      </View>
                    )}
                    {currentLocationSummary.totalInCents !== null && (
                      <View style={[styles.priceRow, styles.priceTotalRow]}>
                        <Text style={styles.priceTotalLabel}>Total</Text>
                        <Text style={styles.priceTotalValue}>
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
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <View style={styles.emptyIconTile}>
                <Icon name="ShoppingBag" size={26} color={BR.ink3} />
              </View>
              <Text style={{ fontSize: 14, color: BR.ink3, marginTop: 12 }}>
                No items from this location yet
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer CTA */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          {isScanning ? (
            <View
              style={[
                styles.footerBtn,
                {
                  backgroundColor: BR.orangeSoft,
                  borderWidth: 1,
                  borderColor: "rgba(255,106,31,0.25)",
                },
              ]}
            >
              <ActivityIndicator size="small" color={BR.orange} />
              <Text style={[styles.footerBtnText, { color: BR.orangeDeep }]}>
                {scanState === "uploading"
                  ? "Sending your photo…"
                  : "Reading your receipt…"}
              </Text>
            </View>
          ) : hasScanDraft ? (
            <TouchableOpacity
              onPress={resumeDraft}
              style={[styles.footerBtn, { backgroundColor: BR.orange }]}
              activeOpacity={0.85}
            >
              <Icon name="ScanLine" size={18} color="#fff" />
              <Text style={styles.footerBtnText}>Continue receipt review</Text>
            </TouchableOpacity>
          ) : allLocationsPriced ? (
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/order/settlement?orderId=${orderId}` as never)
                }
                style={[styles.footerBtn, { backgroundColor: BR.mint }]}
                activeOpacity={0.85}
              >
                <Icon name="Receipt" size={18} color="#fff" />
                <Text style={styles.footerBtnText}>View settlement</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => sourceActionSheetRef.current?.show()}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: BR.orangeDeep,
                  }}
                >
                  Edit prices
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => sourceActionSheetRef.current?.show()}
              style={[styles.footerBtn, { backgroundColor: BR.orange }]}
              activeOpacity={0.85}
            >
              <Icon name="ScanLine" size={18} color="#fff" />
              <Text style={styles.footerBtnText}>Add prices</Text>
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
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <BrText weight="bold" style={{ fontSize: 20, textAlign: "center" }}>
            Add prices
          </BrText>
          <Text
            style={{
              fontSize: 13,
              color: BR.ink3,
              textAlign: "center",
              marginTop: 4,
              marginBottom: 18,
            }}
          >
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
              style={styles.sheetOption}
              activeOpacity={0.8}
            >
              <View style={styles.sheetOptionIcon}>
                <Icon name={item.icon} size={20} color={BR.orangeDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>{item.title}</Text>
                <Text style={styles.sheetOptionSub}>{item.sub}</Text>
              </View>
              <Icon name="ChevronRight" size={16} color={BR.ink3} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => sourceActionSheetRef.current?.hide()}
            style={[
              styles.footerBtn,
              {
                marginTop: 8,
                backgroundColor: BR.paper2,
                borderWidth: 1,
                borderColor: BR.line2,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.footerBtnText, { color: BR.ink }]}>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
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
  segmentControl: {
    flexDirection: "row",
    backgroundColor: BR.paper2,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentBtnActive: {
    backgroundColor: BR.card,
    shadowColor: BR.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: BR.ink3,
  },
  segmentTextActive: {
    color: BR.ink,
  },
  statsLine: {
    fontSize: 12,
    fontFamily: BR_FONT.mono,
    color: BR.ink3,
    letterSpacing: 0.3,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
  },
  locationChipActive: {
    backgroundColor: BR.ink,
    borderColor: BR.ink,
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: BR.ink2,
  },
  locationChipTextActive: {
    color: "#fff",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 18,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BR_RADIUS.sm,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: BR_FONT.mono,
    color: BR.ink3,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: BR.paper2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: BR.ink,
    flex: 1,
    marginRight: 10,
  },
  itemCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: BR.orangeDeep,
    fontFamily: BR_FONT.mono,
  },
  personCard: {
    padding: 14,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
  },
  personName: {
    fontSize: 14,
    fontWeight: "700",
    color: BR.ink,
  },
  personItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  personItemText: {
    fontSize: 13,
    color: BR.ink2,
    flex: 1,
    marginRight: 8,
  },
  personItemPrice: {
    fontSize: 13,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  priceSummaryCard: {
    padding: 14,
    backgroundColor: BR.orangeTint,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,106,31,0.18)",
    gap: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 13,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  priceValue: {
    fontSize: 13,
    color: BR.ink,
    fontFamily: BR_FONT.mono,
  },
  priceTotalRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,106,31,0.2)",
    marginTop: 4,
  },
  priceTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: BR.ink,
  },
  priceTotalValue: {
    fontSize: 17,
    fontWeight: "800",
    color: BR.orange,
    fontFamily: BR_FONT.monoBold,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: BR.paper2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BR.line,
    backgroundColor: BR.paper,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: BR_RADIUS.md,
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
    marginBottom: 10,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BR.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: BR.ink,
  },
  sheetOptionSub: {
    fontSize: 12,
    color: BR.ink3,
    marginTop: 2,
  },
  // Loading screens
  loadingCard: {
    width: "100%",
    padding: 28,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.xl,
    borderWidth: 1,
    borderColor: BR.line,
    alignItems: "center",
  },
  loadingIconTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BR.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingSubtitle: {
    fontSize: 13,
    color: BR.ink3,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
});

const scanStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  // Viewport: takes up the bulk of the screen, NO overflow:hidden so brackets sit on top
  viewport: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  // Photo sits inside the viewport, fills it, clipped to its own bounds
  photoInner: {
    position: "absolute",
    top: BRACKET_THICKNESS,
    left: BRACKET_THICKNESS,
    right: BRACKET_THICKNESS,
    bottom: BRACKET_THICKNESS,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  beamWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 3,
  },
  beam: {
    height: 3,
    backgroundColor: BR.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,77,109,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 18,
  },
  bottomHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontFamily: BR_FONT.mono,
    textAlign: "center",
    lineHeight: 19,
  },
  errorMessage: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 19,
    textAlign: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
