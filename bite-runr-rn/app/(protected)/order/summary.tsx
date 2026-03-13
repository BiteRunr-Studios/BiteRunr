import { router, useLocalSearchParams } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useReceiptScanning } from "@/hooks/useReceiptScanning";
import { useManualPriceEntry } from "@/hooks/useManualPriceEntry";
import {
    RawOrderSummaryData,
    useAiOrderSummary,
} from "@/hooks/useAiOrderSummary";
import { ReceiptConfirmationSheet } from "@/components/receipt-confirmation-sheet";
import { ManualPriceEntrySheet } from "@/components/manual-price-entry-sheet";
import { ListItem } from "@/components/profile/list-item";
import { Button } from "@/components/common/button";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import {
    groupOrderItemsByParticipant,
    materializeResolvedOrderItemTextGroups,
} from "@/lib/order-item-grouping";

type GroupMode = "items" | "people";
type SummaryLocation = RawOrderSummaryData["locations"][number];

function SummaryStateLayout({
    colorScheme,
    title,
    children,
}: {
    colorScheme: "light" | "dark";
    title: string;
    children: ReactNode;
}) {
    return (
        <>
            <SafeAreaView edges={["top"]} />
            <View className="flex-1 bg-background">
                <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-border">
                    <Pressable
                        onPress={() => router.back()}
                        className="p-2 -ml-2 rounded-full active:opacity-70">
                        <Icon
                            name="ChevronLeft"
                            size={24}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </Pressable>
                    <Text className="flex-1 ml-2 text-xl font-bold text-foreground">
                        {title}
                    </Text>
                </View>
                {children}
            </View>
        </>
    );
}

function SummaryLoadingScreen({
    colorScheme,
}: {
    colorScheme: "light" | "dark";
}) {
    return (
        <SummaryStateLayout colorScheme={colorScheme} title="Order Summary">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}>
                <View className="items-center p-6 border rounded-[28px] border-primary/20 bg-card">
                    <View className="justify-center items-center w-16 h-16 rounded-2xl bg-primary/10">
                        <Icon
                            name="ClipboardList"
                            size={30}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </View>
                    <Text className="mt-4 text-2xl font-bold text-center text-foreground">
                        Summarizing order
                    </Text>
                    <Text className="mt-2 text-sm text-center text-muted-foreground">
                        Grouping similar items across all pickup spots...
                    </Text>
                    <View className="flex-row gap-2 items-center mt-5">
                        <ActivityIndicator
                            size="small"
                            color={NAV_THEME[colorScheme].primary}
                        />
                        <Text className="text-sm font-medium text-primary">
                            This only takes a moment
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SummaryStateLayout>
    );
}

function SummaryAiErrorScreen({
    colorScheme,
    error,
    onRetry,
}: {
    colorScheme: "light" | "dark";
    error: string | null;
    onRetry: () => void;
}) {
    return (
        <SummaryStateLayout colorScheme={colorScheme} title="Order Summary">
            <View className="flex-1 justify-center items-center px-6">
                <View className="items-center w-full max-w-sm p-6 border rounded-[28px] border-destructive/15 bg-card">
                    <View className="justify-center items-center w-16 h-16 rounded-2xl bg-destructive/10">
                        <Icon name="CircleAlert" size={30} color="#ef4444" />
                    </View>
                    <Text className="mt-4 text-2xl font-bold text-center text-foreground">
                        We couldn&apos;t summarize this order right now.
                    </Text>
                    <Text className="mt-2 text-sm text-center text-muted-foreground">
                        {error ?? "Please try again in a moment."}
                    </Text>
                    <View className="gap-3 mt-6 w-full">
                        <Button label="Try Again" onPress={onRetry} />
                        <Button
                            label="Back"
                            variant="outline"
                            onPress={() => router.back()}
                        />
                    </View>
                </View>
            </View>
        </SummaryStateLayout>
    );
}

export default function OrderSummary() {
    const params = useLocalSearchParams<{ orderId?: string }>();
    const orderId = params.orderId ? (params.orderId as Id<"orders">) : null;
    const { colorScheme } = useColorScheme();
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
        summary?.locations.find(
            (location) => location.orderLocationId === selectedLocationId,
        ) ??
        summary?.locations[0] ??
        null;

    const {
        state: scanState,
        error: scanError,
        matchedItems,
        receiptStoreName,
        receiptTotal,
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

        const timer = setTimeout(() => resetScan(), 0);
        return () => clearTimeout(timer);
    }, [resetScan, scanState]);

    useEffect(() => {
        if (manualState !== "success") return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
            type: "success",
            text1: "Prices saved",
            visibilityTime: 2500,
        });

        const timer = setTimeout(() => resetManual(), 0);
        return () => clearTimeout(timer);
    }, [manualState, resetManual]);

    const currentLocationSummary = summary?.locationSummaries.find(
        (locationSummary) =>
            locationSummary.orderLocationId ===
            selectedLocation?.orderLocationId,
    );
    const currentLocationLines = currentLocationSummary?.lines ?? [];

    const participantGroups = useMemo(
        () => groupOrderItemsByParticipant(currentLocationLines),
        [currentLocationLines],
    );
    const currentAiLocationSummary = useMemo(
        () =>
            aiSummary?.locations.find(
                (location) =>
                    location.orderLocationId ===
                    selectedLocation?.orderLocationId,
            ) ?? null,
        [aiSummary, selectedLocation?.orderLocationId],
    );
    const itemGroups = useMemo(() => {
        if (!currentAiLocationSummary) {
            return [];
        }

        return materializeResolvedOrderItemTextGroups(
            currentLocationLines,
            currentAiLocationSummary.groups,
        );
    }, [currentAiLocationSummary, currentLocationLines]);

    if (summary === undefined) {
        return <SummaryLoadingScreen colorScheme={colorScheme} />;
    }

    if (summary === null) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-destructive">
                    Not authorized to view this summary
                </Text>
            </View>
        );
    }

    if (aiSummaryStatus === "loading-data") {
        return <SummaryLoadingScreen colorScheme={colorScheme} />;
    }

    if (aiSummaryStatus === "ai-error") {
        return (
            <SummaryAiErrorScreen
                colorScheme={colorScheme}
                error={aiSummaryError}
                onRetry={retryAiSummary}
            />
        );
    }

    if (aiSummaryStatus === "summarizing" || !aiSummary) {
        return <SummaryLoadingScreen colorScheme={colorScheme} />;
    }

    const isScanning = scanState === "uploading" || scanState === "parsing";
    const allLocationsPriced = summary.locationSummaries.every(
        (locationSummary) => locationSummary.subtotalInCents !== null,
    );
    const locationsWithPrices = summary.locationSummaries.filter(
        (locationSummary) => locationSummary.subtotalInCents !== null,
    );
    const locationsMissingPrices = summary.locationSummaries.filter(
        (locationSummary) => locationSummary.subtotalInCents === null,
    );
    const someLocationsPriced =
        locationsWithPrices.length > 0 && locationsMissingPrices.length > 0;

    return (
        <>
            <SafeAreaView edges={["top"]} />
            <View className="flex-1 bg-background">
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <View className="flex-row items-center mb-1">
                        <Pressable
                            onPress={() => router.back()}
                            className="p-2 -ml-2 rounded-full active:opacity-70">
                            <Icon
                                name="ChevronLeft"
                                size={24}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        </Pressable>
                        <Text className="flex-1 ml-2 text-xl font-bold text-foreground">
                            {summary.order.name || "Order Summary"}
                        </Text>
                    </View>
                    <Text className="mb-3 ml-1 text-sm text-muted-foreground">
                        {summary.totalPeople} people · {summary.totalItems}{" "}
                        lines
                    </Text>
                    <View className="flex-row gap-3 items-center">
                        <View className="overflow-hidden flex-1">
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8 }}>
                                {summary.locations.map(
                                    (location: SummaryLocation) => {
                                        const locationSummary =
                                            summary.locationSummaries.find(
                                                (value) =>
                                                    value.orderLocationId ===
                                                    location.orderLocationId,
                                            );
                                        const isSelected =
                                            selectedLocation?.orderLocationId ===
                                            location.orderLocationId;
                                        const hasPrices =
                                            locationSummary?.subtotalInCents !==
                                            null;

                                        return (
                                            <Pressable
                                                key={location.orderLocationId}
                                                onPress={() =>
                                                    setSelectedLocationId(
                                                        location.orderLocationId,
                                                    )
                                                }
                                                className={`flex-row items-center justify-center px-8 py-2 rounded-full ${
                                                    isSelected
                                                        ? "bg-primary"
                                                        : "bg-muted"
                                                }`}>
                                                {hasPrices ? (
                                                    <View
                                                        style={{
                                                            marginRight: 6,
                                                        }}>
                                                        <Icon
                                                            name="CircleCheck"
                                                            size={14}
                                                            color={
                                                                isSelected
                                                                    ? "#fff"
                                                                    : "#22c55e"
                                                            }
                                                        />
                                                    </View>
                                                ) : null}
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
                                    },
                                )}
                            </ScrollView>
                        </View>
                        <View className="p-1 rounded-full bg-muted">
                            <View className="flex-row gap-1 items-center">
                                {(["items", "people"] as GroupMode[]).map(
                                    (mode) => {
                                        const isSelected = groupMode === mode;

                                        return (
                                            <Pressable
                                                key={mode}
                                                onPress={() =>
                                                    setGroupMode(mode)
                                                }
                                                className={`px-4 py-2 rounded-full ${
                                                    isSelected
                                                        ? "bg-background"
                                                        : ""}`}>
                                                <Text
                                                    className={`text-sm font-medium capitalize ${
                                                        isSelected
                                                            ? "text-foreground"
                                                            : "text-muted-foreground"
                                                    }`}>
                                                    {mode}
                                                </Text>
                                            </Pressable>
                                        );
                                    },
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {scanState === "error" && scanError ? (
                    <View className="gap-2 px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
                        <View className="flex-row gap-3 items-center">
                            <Icon
                                name="CircleAlert"
                                size={20}
                                color="#ef4444"
                            />
                            <Text className="flex-1 text-sm text-destructive">
                                {scanError}
                            </Text>
                            <Pressable onPress={resetScan}>
                                <Icon name="X" size={16} color="#ef4444" />
                            </Pressable>
                        </View>
                        <Pressable
                            onPress={() => {
                                resetScan();
                                sourceActionSheetRef.current?.show();
                            }}
                            className="self-start px-4 py-1.5 rounded-full bg-destructive/15">
                            <Text className="text-sm font-medium text-destructive">
                                Try Again
                            </Text>
                        </Pressable>
                    </View>
                ) : null}

                {manualState === "error" && manualError ? (
                    <View className="gap-2 px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
                        <View className="flex-row gap-3 items-center">
                            <Icon
                                name="CircleAlert"
                                size={20}
                                color="#ef4444"
                            />
                            <Text className="flex-1 text-sm text-destructive">
                                {manualError}
                            </Text>
                            <Pressable onPress={resetManual}>
                                <Icon name="X" size={16} color="#ef4444" />
                            </Pressable>
                        </View>
                        <Pressable
                            onPress={() => {
                                resetManual();
                                startManualEntry();
                            }}
                            className="self-start px-4 py-1.5 rounded-full bg-destructive/15">
                            <Text className="text-sm font-medium text-destructive">
                                Try Again
                            </Text>
                        </Pressable>
                    </View>
                ) : null}

                {someLocationsPriced ? (
                    <Pressable
                        onPress={() => {
                            const nextUnpriced = summary.locations.find(
                                (location) =>
                                    locationsMissingPrices.some(
                                        (locationSummary) =>
                                            locationSummary.orderLocationId ===
                                            location.orderLocationId,
                                    ),
                            );

                            if (nextUnpriced) {
                                setSelectedLocationId(
                                    nextUnpriced.orderLocationId,
                                );
                            }
                        }}
                        className="flex-row gap-3 items-center px-4 py-3 mx-4 mt-4 rounded-xl bg-yellow-500/10">
                        <Icon name="CircleAlert" size={18} color="#eab308" />
                        <Text className="flex-1 text-sm text-yellow-700 dark:text-yellow-400">
                            {locationsMissingPrices.length === 1
                                ? `Still need prices for ${
                                      summary.locations.find(
                                          (location) =>
                                              location.orderLocationId ===
                                              locationsMissingPrices[0]
                                                  .orderLocationId,
                                      )?.name ?? "1 location"
                                  }`
                                : `Still need prices for ${locationsMissingPrices.length} locations`}
                        </Text>
                        <Icon name="ChevronRight" size={16} color="#eab308" />
                    </Pressable>
                ) : null}

                <View className="flex-1 px-4 pt-4">
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
                        {currentLocationSummary &&
                        currentLocationSummary.lines.length > 0 ? (
                            <>
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                                        Order Lines
                                    </Text>
                                    <View className="px-2.5 py-0.5 rounded-full bg-muted">
                                        <Text className="text-xs font-medium text-muted-foreground">
                                            {currentLocationSummary.itemCount}
                                        </Text>
                                    </View>
                                </View>

                                {groupMode === "items"
                                    ? itemGroups.map((group) => (
                                          <View
                                              key={group.key}
                                              className="p-4 rounded-2xl border border-muted bg-card">
                                              <View className="flex-row gap-3 justify-between items-center">
                                                  <View className="flex-1">
                                                      <Text className="text-sm font-semibold text-foreground">
                                                          {group.displayName}
                                                      </Text>
                                                      <Text className="mt-1 text-xs text-muted-foreground">
                                                          {group.lineCount === 1
                                                              ? "1 line"
                                                              : `${group.lineCount} lines`}{" "}
                                                          ·{" "}
                                                          {group.peopleCount ===
                                                          1
                                                              ? "1 person"
                                                              : `${group.peopleCount} people`}
                                                      </Text>
                                                  </View>
                                                  {group.subtotalInCents !==
                                                  null ? (
                                                      <Text className="text-sm font-semibold text-primary">
                                                          $
                                                          {(
                                                              group.subtotalInCents /
                                                              100
                                                          ).toFixed(2)}
                                                      </Text>
                                                  ) : null}
                                              </View>
                                          </View>
                                      ))
                                    : participantGroups.map((group) => (
                                          <View
                                              key={group.key}
                                              className="p-4 rounded-2xl border border-muted bg-card">
                                              <Text className="mb-3 text-sm font-semibold text-foreground">
                                                  {group.displayName}
                                              </Text>
                                              <View className="gap-2">
                                                  {group.items.map((line) => (
                                                      <View
                                                          key={line.id}
                                                          className="flex-row gap-3 justify-between items-start">
                                                          <Text className="flex-1 text-sm text-foreground">
                                                              {line.text}
                                                          </Text>
                                                          {line.priceInCents !==
                                                          null ? (
                                                              <Text className="text-sm text-muted-foreground">
                                                                  $
                                                                  {(
                                                                      line.priceInCents /
                                                                      100
                                                                  ).toFixed(2)}
                                                              </Text>
                                                          ) : null}
                                                      </View>
                                                  ))}
                                              </View>
                                          </View>
                                      ))}

                                {currentLocationSummary.subtotalInCents !==
                                null ? (
                                    <>
                                        <View className="flex-row justify-between items-center mt-2">
                                            <Text className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                                                Price Summary
                                            </Text>
                                        </View>
                                        <View className="p-4 rounded-2xl border border-primary/30 bg-primary/5">
                                            <View className="flex-row justify-between items-center mb-2">
                                                <Text className="text-sm text-muted-foreground">
                                                    Subtotal
                                                </Text>
                                                <Text className="text-sm text-foreground">
                                                    $
                                                    {(
                                                        currentLocationSummary.subtotalInCents /
                                                        100
                                                    ).toFixed(2)}
                                                </Text>
                                            </View>
                                            {currentLocationSummary.taxInCents !==
                                            null ? (
                                                <View className="flex-row justify-between items-center mb-2">
                                                    <Text className="text-sm text-muted-foreground">
                                                        Tax
                                                    </Text>
                                                    <Text className="text-sm text-foreground">
                                                        $
                                                        {(
                                                            currentLocationSummary.taxInCents /
                                                            100
                                                        ).toFixed(2)}
                                                    </Text>
                                                </View>
                                            ) : null}
                                            {currentLocationSummary.totalInCents !==
                                            null ? (
                                                <View className="flex-row justify-between items-center pt-2 border-t border-primary/20">
                                                    <Text className="text-base font-semibold text-foreground">
                                                        Total
                                                    </Text>
                                                    <Text className="text-base font-semibold text-primary">
                                                        $
                                                        {(
                                                            currentLocationSummary.totalInCents /
                                                            100
                                                        ).toFixed(2)}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </>
                                ) : null}
                            </>
                        ) : (
                            <View className="justify-center items-center py-12">
                                <Icon
                                    name="ShoppingBag"
                                    size={32}
                                    color={NAV_THEME[colorScheme].border}
                                />
                                <Text className="mt-3 text-muted-foreground">
                                    No lines from this location yet
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    {isScanning ? (
                        <TouchableOpacity
                            className="py-3 w-full rounded-xl border border-primary bg-primary/5"
                            disabled>
                            <View className="flex-row gap-2 justify-center items-center">
                                <ActivityIndicator
                                    size="small"
                                    color={NAV_THEME[colorScheme].primary}
                                />
                                <Text className="text-sm font-semibold text-primary">
                                    {scanState === "uploading"
                                        ? "Sending your photo..."
                                        : "Reading your receipt..."}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ) : hasScanDraft ? (
                        <TouchableOpacity
                            className="py-3 w-full rounded-xl bg-primary"
                            onPress={resumeDraft}>
                            <Text className="text-sm font-semibold text-center text-white">
                                Continue receipt review
                            </Text>
                        </TouchableOpacity>
                    ) : allLocationsPriced ? (
                        <View className="gap-2 items-center">
                            <TouchableOpacity
                                className="py-3 w-full rounded-xl bg-primary"
                                onPress={() =>
                                    router.push(
                                        `/order/settlement?orderId=${orderId}` as never,
                                    )
                                }>
                                <Text className="text-sm font-semibold text-center text-white">
                                    View Settlement
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() =>
                                    sourceActionSheetRef.current?.show()
                                }
                                className="py-2">
                                <Text className="text-sm font-medium text-primary">
                                    Edit prices
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            className="py-3 w-full rounded-xl bg-primary"
                            onPress={() =>
                                sourceActionSheetRef.current?.show()
                            }>
                            <Text className="text-sm font-semibold text-center text-white">
                                Add Prices
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ActionSheet
                ref={sourceActionSheetRef}
                containerStyle={{
                    backgroundColor:
                        colorScheme === "dark"
                            ? "hsl(0, 0%, 7%)"
                            : "hsl(0, 0%, 96%)",
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                }}
                gestureEnabled
                defaultOverlayOpacity={0.3}
                useBottomSafeAreaPadding>
                <View className="gap-3 p-4">
                    <Text className="mb-1 text-lg font-bold text-center text-foreground">
                        Add Prices
                    </Text>
                    <Text className="-mt-1 mb-1 text-xs text-center text-muted-foreground">
                        Scan a receipt or enter prices by hand
                    </Text>

                    <ListItem
                        iconName="Camera"
                        title="Take Photo"
                        subtitle="Use your camera to capture the receipt"
                        onPress={() => {
                            sourceActionSheetRef.current?.hide();
                            void startScan("camera");
                        }}
                    />

                    <ListItem
                        iconName="Image"
                        title="Choose from Library"
                        subtitle="Select an existing photo"
                        onPress={() => {
                            sourceActionSheetRef.current?.hide();
                            void startScan("library");
                        }}
                    />

                    <ListItem
                        iconName="DollarSign"
                        title="Enter Manually"
                        subtitle="Type in prices for each order line"
                        onPress={() => {
                            sourceActionSheetRef.current?.hide();
                            setTimeout(() => startManualEntry(), 400);
                        }}
                    />

                    <Button
                        label="Cancel"
                        variant="outline"
                        onPress={() => sourceActionSheetRef.current?.hide()}
                    />
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
