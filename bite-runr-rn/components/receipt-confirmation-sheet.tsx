import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import Icon from "@/components/common/icon";
import type { MatchedItem } from "@/hooks/useReceiptScanning";

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  userName: string;
  priceInCents: number | null;
}

interface ReceiptConfirmationSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  matchedItems: MatchedItem[];
  orderItems: OrderItem[] | null | undefined;
  onUpdateMatch: (
    index: number,
    orderItemId: string | null,
    priceInCents?: number | null
  ) => void;
  receiptStoreName: string | null;
  receiptTotal: number | null;
  isSaving: boolean;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

function MatchItem({
  item,
  index,
  orderItems,
  onUpdateMatch,
  colorScheme,
}: {
  item: MatchedItem;
  index: number;
  orderItems: OrderItem[] | null | undefined;
  onUpdateMatch: (
    index: number,
    orderItemId: string | null,
    priceInCents?: number | null
  ) => void;
  colorScheme: "light" | "dark";
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [manualPrice, setManualPrice] = useState("");

  const effectivePrice =
    item.manualPriceInCents ?? item.receiptItem.priceInCents;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-green-500";
    if (confidence >= 0.4) return "text-yellow-500";
    return "text-red-500";
  };

  const handlePriceChange = (text: string) => {
    // Allow only numbers and a single decimal point
    let cleaned = text.replace(/[^0-9.]/g, "");
    // Remove extra decimal points (keep only the first one)
    const decimalIndex = cleaned.indexOf(".");
    if (decimalIndex !== -1) {
      cleaned =
        cleaned.slice(0, decimalIndex + 1) +
        cleaned.slice(decimalIndex + 1).replace(/\./g, "");
    }
    setManualPrice(cleaned);

    // Convert to cents
    const value = parseFloat(cleaned);
    if (!isNaN(value)) {
      const cents = Math.round(value * 100);
      onUpdateMatch(index, item.matchedOrderItemId, cents);
    } else if (cleaned === "") {
      onUpdateMatch(index, item.matchedOrderItemId, null);
    }
  };

  const handleSelectOrderItem = (orderItemId: string | null) => {
    onUpdateMatch(index, orderItemId);
    setIsExpanded(false);
  };

  return (
    <View className="mb-3 overflow-hidden border rounded-xl border-border bg-card">
      {/* Receipt Item Header */}
      <View className="p-3 border-b border-border bg-muted/50">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground">
              {item.receiptItem.name}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Qty: {item.receiptItem.quantity} ·{" "}
              {formatPrice(item.receiptItem.priceInCents)}
            </Text>
          </View>
          {item.matchedOrderItemId && (
            <View
              className={`px-2 py-1 rounded-full ${
                item.confidence >= 0.7
                  ? "bg-green-500/20"
                  : item.confidence >= 0.4
                    ? "bg-yellow-500/20"
                    : "bg-red-500/20"
              }`}>
              <Text className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                {Math.round(item.confidence * 100)}% match
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Match Section */}
      <View className="p-3">
        {/* Matched Order Item */}
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          className="flex-row items-center justify-between py-2">
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Matched to:</Text>
            {item.matchedOrderItemId ? (
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-sm font-medium text-primary">
                  {item.matchedItemName}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  ({item.matchedUserName})
                </Text>
              </View>
            ) : (
              <Text className="mt-1 text-sm italic text-destructive">
                No match - tap to select
              </Text>
            )}
          </View>
          <Icon
            name={isExpanded ? "ChevronUp" : "ChevronDown"}
            size={20}
            color={NAV_THEME[colorScheme].border}
          />
        </Pressable>

        {/* Expanded Order Item Selection */}
        {isExpanded && (
          <View className="pt-2 mt-2 border-t border-border">
            <Text className="mb-2 text-xs font-medium text-muted-foreground">
              Select order item:
            </Text>
            <ScrollView className="max-h-40" nestedScrollEnabled>
              {/* Unmatched option */}
              <Pressable
                onPress={() => handleSelectOrderItem(null)}
                className={`flex-row items-center p-2 mb-1 rounded-lg ${
                  !item.matchedOrderItemId ? "bg-primary/20" : "bg-muted"
                }`}>
                <Text className="text-sm text-muted-foreground italic">
                  No match (skip this item)
                </Text>
              </Pressable>

              {orderItems?.map((oi) => (
                <Pressable
                  key={oi.id}
                  onPress={() => handleSelectOrderItem(oi.id)}
                  className={`flex-row items-center justify-between p-2 mb-1 rounded-lg ${
                    item.matchedOrderItemId === oi.id
                      ? "bg-primary/20"
                      : "bg-muted"
                  }`}>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">
                      {oi.itemName}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {oi.userName} · Qty: {oi.quantity}
                    </Text>
                  </View>
                  {item.matchedOrderItemId === oi.id && (
                    <Icon
                      name="Check"
                      size={16}
                      color={NAV_THEME[colorScheme].primary}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Price Override */}
        {item.matchedOrderItemId && (
          <View className="flex-row items-center gap-2 pt-2 mt-2 border-t border-border">
            <Text className="text-xs text-muted-foreground">Price:</Text>
            <View className="flex-row items-center flex-1 px-2 py-1 border rounded-lg border-input bg-background">
              <Text className="text-sm text-muted-foreground">$</Text>
              <TextInput
                className="flex-1 px-1 text-sm text-foreground"
                placeholder={
                  effectivePrice !== null ? (effectivePrice / 100).toFixed(2) : "0.00"
                }
                placeholderTextColor={NAV_THEME[colorScheme].border}
                value={manualPrice}
                onChangeText={handlePriceChange}
                keyboardType="decimal-pad"
              />
            </View>
            <Text className="text-sm font-medium text-foreground">
              = {formatPrice(effectivePrice)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function ReceiptConfirmationSheet({
  visible,
  onClose,
  onConfirm,
  matchedItems,
  orderItems,
  onUpdateMatch,
  receiptStoreName,
  receiptTotal,
  isSaving,
}: ReceiptConfirmationSheetProps) {
  const actionSheetRef = useRef<ActionSheetRef>(null);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    if (visible) {
      actionSheetRef.current?.show();
    } else {
      actionSheetRef.current?.hide();
    }
  }, [visible]);

  const validMatchCount = matchedItems.filter(
    (m) =>
      m.matchedOrderItemId &&
      (m.manualPriceInCents ?? m.receiptItem.priceInCents) !== null
  ).length;

  const totalToSave = matchedItems
    .filter((m) => m.matchedOrderItemId)
    .reduce(
      (sum, m) =>
        sum + (m.manualPriceInCents ?? m.receiptItem.priceInCents ?? 0),
      0
    );

  return (
    <ActionSheet
      ref={actionSheetRef}
      containerStyle={{
        backgroundColor: NAV_THEME[colorScheme].background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: "85%",
      }}
      gestureEnabled={true}
      onClose={onClose}
      defaultOverlayOpacity={0.3}
      useBottomSafeAreaPadding={true}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-4 pt-4 pb-3 border-b border-border">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-foreground">
                Confirm Receipt Items
              </Text>
              {receiptStoreName && (
                <Text className="text-sm text-muted-foreground">
                  {receiptStoreName}
                </Text>
              )}
            </View>
            {receiptTotal !== null && (
              <View className="px-3 py-1 rounded-full bg-primary/20">
                <Text className="text-sm font-medium text-primary">
                  Total: {formatPrice(receiptTotal)}
                </Text>
              </View>
            )}
          </View>
          <Text className="mt-2 text-sm text-muted-foreground">
            Review and confirm the matches below. Tap an item to change its
            match or edit the price.
          </Text>
        </View>

        {/* Items List */}
        <ScrollView
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          {matchedItems.map((item, index) => (
            <MatchItem
              key={index}
              item={item}
              index={index}
              orderItems={orderItems}
              onUpdateMatch={onUpdateMatch}
              colorScheme={colorScheme}
            />
          ))}
        </ScrollView>

        {/* Footer */}
        <View className="px-4 py-3 border-t border-border bg-background">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm text-muted-foreground">
              {validMatchCount} of {matchedItems.length} items matched
            </Text>
            <Text className="text-base font-semibold text-foreground">
              Saving: {formatPrice(totalToSave)}
            </Text>
          </View>
          <View className="flex-col gap-2">
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isSaving || validMatchCount === 0}
              className={`w-full py-3 rounded-lg ${
                isSaving || validMatchCount === 0
                  ? "bg-primary/50"
                  : "bg-primary"
              }`}>
              <Text className="text-base font-semibold text-center text-white">
                {isSaving
                  ? "Saving..."
                  : `Save ${validMatchCount} Price${validMatchCount !== 1 ? "s" : ""}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving}
              className="w-full py-3 border rounded-lg border-input bg-background">
              <Text className="text-base font-semibold text-center text-foreground">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ActionSheet>
  );
}
