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
import { ReceiptConfirmationSheet } from "@/components/receipt-confirmation-sheet";
import { ListItem } from "@/components/profile/list-item";
import { Button } from "@/components/common/button";

type Location = {
    orderLocationId: string;
    locationId: string;
    name: string;
};

export default function OrderSummary() {
    const { orderId } = useLocalSearchParams();
    const { colorScheme } = useColorScheme();
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(
        null,
    );
    const sourceActionSheetRef = useRef<ActionSheetRef>(null);

    const summary = useQuery(
        api.orderItems.getOrderSummary,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

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
        cancelScan,
        reset: resetScan,
    } = useReceiptScanning(
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

    // Set initial selected location
    useEffect(() => {
        if (
            summary?.locations &&
            summary.locations.length > 0 &&
            !selectedLocation
        ) {
            setSelectedLocation(summary.locations[0]);
        }
    }, [summary?.locations, selectedLocation]);

    const handleScanPress = () => {
        sourceActionSheetRef.current?.show();
    };

    const handleSourceSelect = async (source: "camera" | "library") => {
        sourceActionSheetRef.current?.hide();
        await startScan(source);
    };

    const handleConfirmClose = () => {
        cancelScan();
    };

    const handleConfirm = async () => {
        await confirmMatches();
    };

    if (summary === undefined) {
        return (
            <View className="items-center justify-center flex-1 bg-background">
                <Text className="text-foreground">Loading...</Text>
            </View>
        );
    }

    if (summary === null) {
        return (
            <View className="items-center justify-center flex-1 bg-background">
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

    return (
        <>
            <SafeAreaView edges={["top"]} />
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <View className="flex-row items-center mb-2">
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
                            Order Summary
                        </Text>
                    </View>
                    <Text className="text-sm text-muted-foreground">
                        {summary.totalPeople} people · {summary.totalItems}{" "}
                        items
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="pt-4"
                        contentContainerStyle={{ gap: 8 }}>
                        {summary.locations.map((location) => (
                            <Pressable
                                key={location.orderLocationId}
                                onPress={() => setSelectedLocation(location)}
                                className={`flex-row items-center justify-center px-8 py-2 rounded-full ${
                                    selectedLocation?.orderLocationId ===
                                    location.orderLocationId
                                        ? "bg-primary"
                                        : "bg-muted"
                                }`}>
                                <Text
                                    className={`text ${
                                        selectedLocation?.orderLocationId ===
                                        location.orderLocationId
                                            ? "text-white"
                                            : "text-muted-foreground"
                                    }`}>
                                    {location.name}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Pickup Reminder */}
                <View className="flex-row items-center gap-3 px-4 py-3 mx-4 mt-4 rounded-xl bg-primary/10">
                    <Icon
                        name="ShoppingBag"
                        size={20}
                        color={NAV_THEME[colorScheme].primary}
                    />
                    <Text className="flex-1 text-sm text-foreground">
                        Don't forget. You're picking up this order!
                    </Text>
                </View>

                {/* Scan Error Banner */}
                {scanState === "error" && scanError && (
                    <View className="flex-row items-center gap-3 px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
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
                )}

                {/* Items List */}
                <View className="flex-1 px-4 py-4">
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
                        {currentLocationSummary &&
                        currentLocationSummary.items.length > 0 ? (
                            <>
                                {currentLocationSummary.items.map((item) => (
                                    <View
                                        key={item.itemId}
                                        className="p-4 border rounded-2xl border-muted bg-card">
                                        <View className="flex-row items-center justify-between">
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
                                            <View className="px-3 py-1 rounded-full bg-primary/20">
                                                <Text className="text-sm font-semibold text-primary">
                                                    x{item.totalQuantity}
                                                </Text>
                                            </View>
                                        </View>
                                        {item.subItems.length > 0 && (
                                            <View className="pt-3 mt-3 border-t border-muted">
                                                {item.baseQuantity > 0 && (
                                                    <View className="flex-row items-center justify-between mb-2">
                                                        <Text className="text-sm text-muted-foreground">
                                                            No modifications
                                                        </Text>
                                                        <Text className="text-sm text-muted-foreground">
                                                            x{item.baseQuantity}
                                                        </Text>
                                                    </View>
                                                )}
                                                {item.subItems.map(
                                                    (subItem, index) => (
                                                        <View
                                                            key={index}
                                                            className="flex-row items-start justify-between mb-2 last:mb-0">
                                                            <View className="flex-row items-start flex-1 gap-2">
                                                                <Icon
                                                                    name="MessageSquare"
                                                                    size={14}
                                                                    color={
                                                                        NAV_THEME[
                                                                            colorScheme
                                                                        ].border
                                                                    }
                                                                    style={{
                                                                        marginTop: 2,
                                                                    }}
                                                                />
                                                                <Text className="flex-1 text-sm italic text-muted-foreground">
                                                                    "
                                                                    {
                                                                        subItem.comment
                                                                    }
                                                                    "
                                                                </Text>
                                                            </View>
                                                            <Text className="ml-2 text-sm text-muted-foreground">
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
                                    <View className="p-4 mt-2 border rounded-2xl border-primary/30 bg-primary/5">
                                        <View className="flex-row items-center justify-between mb-2">
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
                                            <View className="flex-row items-center justify-between mb-2">
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
                                            <View className="flex-row items-center justify-between pt-2 border-t border-primary/20">
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
                                )}
                            </>
                        ) : (
                            <View className="items-center justify-center py-12">
                                <Text className="text-muted-foreground">
                                    No items from this location
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Footer */}
                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    <TouchableOpacity
                        className={`w-full py-3 border rounded-lg border-primary ${
                            isScanning ? "bg-primary/5" : "bg-primary/10"
                        }`}
                        onPress={handleScanPress}
                        disabled={isScanning}>
                        {isScanning ? (
                            <View className="flex-row items-center justify-center gap-2">
                                <ActivityIndicator
                                    size="small"
                                    color={NAV_THEME[colorScheme].primary}
                                />
                                <Text className="text-sm font-semibold text-primary">
                                    {scanState === "uploading"
                                        ? "Uploading..."
                                        : "Analyzing receipt..."}
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-sm font-semibold text-center text-primary">
                                Scan receipt for{" "}
                                {selectedLocation?.name ?? "store"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Source Selection Action Sheet */}
            <ActionSheet
                ref={sourceActionSheetRef}
                containerStyle={{
                    backgroundColor: NAV_THEME[colorScheme].background,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                }}
                gestureEnabled={true}
                defaultOverlayOpacity={0.3}
                useBottomSafeAreaPadding={true}>
                <View className="gap-3 p-4 bg-background">
                    <Text className="mb-1 text-lg font-bold text-center text-foreground">
                        Scan Receipt
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
        </>
    );
}
