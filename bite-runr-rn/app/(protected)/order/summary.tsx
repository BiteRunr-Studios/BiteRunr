import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { useReceiptScanning } from "@/hooks/useReceiptScanning";
import { useManualPriceEntry } from "@/hooks/useManualPriceEntry";
import { ReceiptConfirmationSheet } from "@/components/receipt-confirmation-sheet";
import { ManualPriceEntrySheet } from "@/components/manual-price-entry-sheet";
import { ListItem } from "@/components/profile/list-item";
import { Button } from "@/components/common/button";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

type Location = {
    orderLocationId: string;
    locationId: string;
    name: string;
};

export default function OrderSummary() {
    const { orderId } = useLocalSearchParams();
    const { colorScheme } = useColorScheme();
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
        null,
    );
    const sourceActionSheetRef = useRef<ActionSheetRef>(null);

    const summary = useQuery(
        api.orderItems.getOrderSummary,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    const selectedLocation = (() => {
        if (!summary?.locations || summary.locations.length === 0) {
            return null;
        }

        return (
            summary.locations.find(
                (location) => location.orderLocationId === selectedLocationId,
            ) ?? summary.locations[0]
        );
    })();

    // Receipt scanning hook
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
        orderId as Id<"orders"> | null,
    );

    // Manual price entry hook
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
        orderId as Id<"orders"> | null,
    );

    // Get order items for the confirmation sheet
    const orderItems = useQuery(
        api.receiptScanning.getOrderItemsForLocation,
        selectedLocation?.orderLocationId
            ? {
                  orderLocationId:
                      selectedLocation.orderLocationId as Id<"orderLocations">,
              }
            : "skip",
    );

    // Show toast on scan success and reset
    useEffect(() => {
        if (scanState !== "success") return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
            type: "success",
            text1: "Receipt prices saved",
            visibilityTime: 2500,
        });

        const resetTimer = setTimeout(() => {
            resetScan();
        }, 0);

        return () => clearTimeout(resetTimer);
    }, [scanState, resetScan]);

    // Show toast on manual entry success and reset
    useEffect(() => {
        if (manualState !== "success") return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
            type: "success",
            text1: "Prices saved",
            visibilityTime: 2500,
        });

        const resetTimer = setTimeout(() => {
            resetManual();
        }, 0);

        return () => clearTimeout(resetTimer);
    }, [manualState, resetManual]);

    const handleSourceSelect = async (source: "camera" | "library") => {
        sourceActionSheetRef.current?.hide();
        await startScan(source);
    };

    const handleConfirmClose = () => {
        dismissScan();
    };

    const handleConfirm = async () => {
        await confirmMatches();
    };

    if (summary === undefined) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-foreground">Loading...</Text>
            </View>
        );
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

    // Get the current location's items
    const currentLocationSummary = summary.locationSummaries.find(
        (ls) => ls.orderLocationId === selectedLocation?.orderLocationId,
    );

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
            <SafeAreaView edges={["top"]} />
            <View className="flex-1 bg-background">
                {/* Header */}
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
                        items
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}>
                        {summary.locations.map((location) => {
                            const locSummary = summary.locationSummaries.find(
                                (ls) =>
                                    ls.orderLocationId ===
                                    location.orderLocationId,
                            );
                            const hasPrices =
                                locSummary?.subtotalInCents !== null;
                            const isSelected =
                                selectedLocation?.orderLocationId ===
                                location.orderLocationId;

                            return (
                                <Pressable
                                    key={location.orderLocationId}
                                    onPress={() =>
                                        setSelectedLocationId(
                                            location.orderLocationId,
                                        )
                                    }
                                    className={`flex-row items-center justify-center px-8 py-2 rounded-full ${
                                        isSelected ? "bg-primary" : "bg-muted"
                                    }`}>
                                    {hasPrices && (
                                        <View style={{ marginRight: 6 }}>
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
                                    )}
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

                {/* Scan Error Banner */}
                {scanState === "error" && scanError && (
                    <View className="gap-2 px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
                        <View className="flex-row gap-3 items-center">
                            <Icon
                                name="CircleAlert"
                                size={20}
                                color={NAV_THEME[colorScheme].notification}
                            />
                            <Text className="flex-1 text-sm text-destructive">
                                {scanError}
                            </Text>
                            <Pressable onPress={resetScan}>
                                <Icon
                                    name="X"
                                    size={16}
                                    color={NAV_THEME[colorScheme].notification}
                                />
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
                )}

                {/* Manual Entry Error Banner */}
                {manualState === "error" && manualError && (
                    <View className="gap-2 px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
                        <View className="flex-row gap-3 items-center">
                            <Icon
                                name="CircleAlert"
                                size={20}
                                color={NAV_THEME[colorScheme].notification}
                            />
                            <Text className="flex-1 text-sm text-destructive">
                                {manualError}
                            </Text>
                            <Pressable onPress={resetManual}>
                                <Icon
                                    name="X"
                                    size={16}
                                    color={NAV_THEME[colorScheme].notification}
                                />
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
                )}

                {/* Remaining Locations Banner */}
                {someLocationsPriced && (
                    <Pressable
                        onPress={() => {
                            const nextUnpriced = summary.locations.find((loc) =>
                                locationsMissingPrices.some(
                                    (ls) =>
                                        ls.orderLocationId ===
                                        loc.orderLocationId,
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
                                ? `Still need prices for ${summary.locations.find((l) => l.orderLocationId === locationsMissingPrices[0].orderLocationId)?.name ?? "1 location"}`
                                : `Still need prices for ${locationsMissingPrices.length} locations`}
                        </Text>
                        <Icon name="ChevronRight" size={16} color="#eab308" />
                    </Pressable>
                )}

                {/* Items List */}
                <View className="flex-1 px-4 pt-4">
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
                        {currentLocationSummary &&
                        currentLocationSummary.items.length > 0 ? (
                            <>
                                {/* Section Header */}
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                                        Items
                                    </Text>
                                    <View className="px-2.5 py-0.5 rounded-full bg-muted">
                                        <Text className="text-xs font-medium text-muted-foreground">
                                            {currentLocationSummary.itemCount}
                                        </Text>
                                    </View>
                                </View>

                                {currentLocationSummary.items.map((item) => (
                                    <View
                                        key={item.itemId}
                                        className="p-4 rounded-2xl border border-muted bg-card">
                                        <View className="flex-row gap-3 items-center">
                                            <View className="justify-center items-center w-8 h-8 rounded-full bg-primary/10">
                                                <Text className="text-xs font-semibold text-primary">
                                                    x{item.totalQuantity}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-base font-medium text-foreground">
                                                    {item.itemName}
                                                </Text>
                                                {item.priceInCents !== null && (
                                                    <Text className="text-sm text-muted-foreground">
                                                        $
                                                        {(
                                                            item.priceInCents /
                                                            100
                                                        ).toFixed(2)}{" "}
                                                        each
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        {item.subItems.length > 0 && (
                                            <View className="pt-2 mt-3 ml-11 border-t border-muted">
                                                {item.baseQuantity > 0 && (
                                                    <View className="flex-row items-center justify-between py-1.5">
                                                        <Text className="flex-1 text-xs text-muted-foreground">
                                                            Standard
                                                        </Text>
                                                        <Text className="ml-2 text-xs font-medium text-muted-foreground">
                                                            x{item.baseQuantity}
                                                        </Text>
                                                    </View>
                                                )}
                                                {item.subItems.map(
                                                    (subItem) => (
                                                        <View
                                                            key={`${item.itemId}-${subItem.comment}-${subItem.quantity}`}
                                                            className="flex-row items-center justify-between gap-2 py-1.5">
                                                            <Text
                                                                numberOfLines={
                                                                    1
                                                                }
                                                                className="flex-1 text-xs text-muted-foreground">
                                                                {subItem.comment.trim()}
                                                            </Text>
                                                            <Text className="ml-2 text-xs font-medium text-muted-foreground">
                                                                x
                                                                {
                                                                    subItem.quantity
                                                                }
                                                            </Text>
                                                        </View>
                                                    ),
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}

                                {/* Price Breakdown */}
                                {currentLocationSummary.subtotalInCents !==
                                    null && (
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
                                                null && (
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
                                            )}
                                            {currentLocationSummary.totalInCents !==
                                                null && (
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
                                            )}
                                        </View>
                                    </>
                                )}
                            </>
                        ) : (
                            <View className="justify-center items-center py-12">
                                <Icon
                                    name="ShoppingBag"
                                    size={32}
                                    color={NAV_THEME[colorScheme].border}
                                />
                                <Text className="mt-3 text-muted-foreground">
                                    No items from this location
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Footer */}
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

            {/* Source Selection Action Sheet */}
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
                gestureEnabled={true}
                defaultOverlayOpacity={0.3}
                useBottomSafeAreaPadding={true}>
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
                        onPress={() => handleSourceSelect("camera")}
                    />

                    <ListItem
                        iconName="Image"
                        title="Choose from Library"
                        subtitle="Select an existing photo"
                        onPress={() => handleSourceSelect("library")}
                    />

                    <ListItem
                        iconName="DollarSign"
                        title="Enter Manually"
                        subtitle="Type in prices for each item"
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

            {/* Receipt Confirmation Sheet */}
            <ReceiptConfirmationSheet
                visible={scanState === "confirming" || scanState === "saving"}
                onClose={handleConfirmClose}
                onConfirm={handleConfirm}
                matchedItems={matchedItems}
                orderItems={orderItems}
                onUpdateMatch={updateMatch}
                receiptStoreName={receiptStoreName}
                receiptTotal={receiptTotal}
                isSaving={scanState === "saving"}
            />

            {/* Manual Price Entry Sheet */}
            <ManualPriceEntrySheet
                visible={manualState === "entering" || manualState === "saving"}
                onDismiss={dismissManual}
                onSave={saveManualPrices}
                orderItems={manualOrderItems}
                prices={manualPrices}
                onUpdatePrice={updatePrice}
                locationName={selectedLocation?.name ?? "Store"}
                isSaving={manualState === "saving"}
            />
        </>
    );
}
