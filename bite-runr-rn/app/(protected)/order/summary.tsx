import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
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

type Location = {
  orderLocationId: string;
  locationId: string;
  name: string;
};

export default function OrderSummary() {
  const { orderId } = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const sourceActionSheetRef = useRef<ActionSheetRef>(null);

  const summary = useQuery(
    api.orderItems.getOrderSummary,
    orderId ? { orderId: orderId as Id<"orders"> } : "skip"
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
    orderId as Id<"orders"> | null
  );

  // Get order items for the confirmation sheet
  const orderItems = useQuery(
    api.receiptScanning.getOrderItemsForLocation,
    selectedLocation?.orderLocationId
      ? {
          orderLocationId: selectedLocation.orderLocationId as Id<"orderLocations">,
        }
      : "skip"
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
    (ls) => ls.orderLocationId === selectedLocation?.orderLocationId
  );

  const isScanning =
    scanState === "uploading" ||
    scanState === "parsing";

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
            {summary.totalPeople} people · {summary.totalItems} items
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
                  selectedLocation?.orderLocationId === location.orderLocationId
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
            <Text className="flex-1 text-sm text-destructive">{scanError}</Text>
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
              currentLocationSummary.items.map((item) => (
                <View
                  key={item.id}
                  className="p-4 border rounded-2xl border-muted bg-card">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row flex-1 gap-3">
                      <Image
                        style={{ width: 40, height: 40 }}
                        className="rounded-full"
                        source={{
                          uri:
                            item.user?.avatarUrl ??
                            `https://ui-avatars.com/api/?name=${item.user?.firstName ?? ""}+${item.user?.lastName ?? ""}&background=FFE7CC&color=000`,
                        }}
                      />
                      <View className="flex-1">
                        <Text className="text-base font-medium text-foreground">
                          {item.itemName}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {item.user?.firstName} {item.user?.lastName}
                        </Text>
                      </View>
                    </View>
                    <View className="px-3 py-1 rounded-full bg-primary/20">
                      <Text className="text-sm font-semibold text-primary">
                        x{item.quantity}
                      </Text>
                    </View>
                  </View>
                  {item.comments && (
                    <View className="flex-row items-start gap-2 pt-3 mt-3 border-t border-muted">
                      <Icon
                        name="MessageSquare"
                        size={14}
                        color={NAV_THEME[colorScheme].border}
                      />
                      <Text className="flex-1 text-sm italic text-muted-foreground">
                        "{item.comments}"
                      </Text>
                    </View>
                  )}
                </View>
              ))
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
                <ActivityIndicator size="small" color={NAV_THEME[colorScheme].primary} />
                <Text className="text-sm font-semibold text-primary">
                  {scanState === "uploading"
                    ? "Uploading..."
                    : "Analyzing receipt..."}
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-semibold text-center text-primary">
                Scan receipt for {selectedLocation?.name ?? "store"}
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
        <View className="p-4 bg-background">
          <Text className="mb-4 text-lg font-bold text-center text-foreground">
            Scan Receipt
          </Text>

          <TouchableOpacity
            onPress={() => handleSourceSelect("camera")}
            className="flex-row items-center gap-4 p-4 mb-2 rounded-xl bg-muted">
            <View className="items-center justify-center w-12 h-12 rounded-full bg-primary/20">
              <Icon
                name="Camera"
                size={24}
                color={NAV_THEME[colorScheme].primary}
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                Take Photo
              </Text>
              <Text className="text-sm text-muted-foreground">
                Use your camera to capture the receipt
              </Text>
            </View>
            <Icon
              name="ChevronRight"
              size={20}
              color={NAV_THEME[colorScheme].border}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSourceSelect("library")}
            className="flex-row items-center gap-4 p-4 mb-4 rounded-xl bg-muted">
            <View className="items-center justify-center w-12 h-12 rounded-full bg-primary/20">
              <Icon
                name="Image"
                size={24}
                color={NAV_THEME[colorScheme].primary}
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                Choose from Library
              </Text>
              <Text className="text-sm text-muted-foreground">
                Select an existing photo
              </Text>
            </View>
            <Icon
              name="ChevronRight"
              size={20}
              color={NAV_THEME[colorScheme].border}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => sourceActionSheetRef.current?.hide()}
            className="w-full py-3 border rounded-lg border-input bg-background">
            <Text className="text-base font-semibold text-center text-foreground">
              Cancel
            </Text>
          </TouchableOpacity>
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
