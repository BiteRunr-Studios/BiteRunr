import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/common/icon";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import { groupOrderItemsByParticipant } from "@/lib/order-item-grouping";

interface OrderItem {
  id: string;
  orderUserId: string;
  text: string;
  userName: string;
  priceInCents: number | null;
}

interface ManualPriceEntrySheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: () => void;
  orderItems: OrderItem[] | null;
  prices: Map<string, number | null>;
  onUpdatePrice: (orderItemId: string, priceInCents: number | null) => void;
  locationName: string;
  isSaving: boolean;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2);
}

function PriceItemCard({
  orderItem,
  priceInCents,
  onUpdatePrice,
}: {
  orderItem: OrderItem;
  priceInCents: number | null;
  onUpdatePrice: (orderItemId: string, priceInCents: number | null) => void;
}) {
  const [localPrice, setLocalPrice] = useState(() => {
    if (priceInCents !== null) return formatPrice(priceInCents);
    return "";
  });

  const handlePriceChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, "");
    const decimalIndex = cleaned.indexOf(".");
    if (decimalIndex !== -1) {
      cleaned =
        cleaned.slice(0, decimalIndex + 1) +
        cleaned.slice(decimalIndex + 1).replace(/\./g, "");
    }
    setLocalPrice(cleaned);

    const value = parseFloat(cleaned);
    if (!Number.isNaN(value)) {
      onUpdatePrice(orderItem.id, Math.round(value * 100));
    } else if (cleaned === "") {
      onUpdatePrice(orderItem.id, null);
    }
  };

  const hasPrice = priceInCents !== null && priceInCents > 0;

  return (
    <View
      className={`mb-2 rounded-2xl border bg-white p-3 ${
        hasPrice
          ? "border-[rgba(46,190,123,0.2)]"
          : "border-[rgba(26,20,16,0.08)]"
      }`}
    >
      <View className="flex-row items-start gap-2.5">
        <View
          className={`h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            hasPrice
              ? "border-transparent bg-[#DDF5E8]"
              : "border border-[rgba(26,20,16,0.14)] bg-[#FCEFE0]"
          }`}
        >
          {hasPrice ? (
            <Icon name="Check" size={13} color={BR.mint} strokeWidth={3} />
          ) : null}
        </View>
        <View className="flex-1">
          <Text
            className="text-[13px] text-[#1A1410]"
            style={BR_FONT_STYLE.displaySemibold}
          >
            {orderItem.text}
          </Text>
        </View>
      </View>

      <View className="ml-[34px] mt-2.5">
        <View className="h-9 flex-row items-center gap-1 rounded-[10px] border border-[rgba(26,20,16,0.14)] bg-white px-2.5">
          <Text
            className="text-[13px] text-[#8A7A6E]"
            style={BR_FONT_STYLE.mono}
          >
            $
          </Text>
          <TextInput
            className="flex-1 p-0 text-[13px] text-[#1A1410]"
            style={BR_FONT_STYLE.displayMedium}
            placeholder={
              orderItem.priceInCents !== null
                ? formatPrice(orderItem.priceInCents)
                : "0.00"
            }
            placeholderTextColor={BR.ink3}
            value={localPrice}
            onChangeText={handlePriceChange}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  pricedCount,
  totalCount,
}: {
  title: string;
  pricedCount: number;
  totalCount: number;
}) {
  return (
    <View className="mb-2.5 mt-[18px] flex-row items-center gap-2">
      <Text
        className="text-[10px] tracking-[1.2px] text-[#8A7A6E] uppercase"
        style={BR_FONT_STYLE.monoBold}
      >
        {title}
      </Text>
      <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#FCEFE0] px-1.5">
        <Text
          className="text-[10px] text-[#8A7A6E]"
          style={BR_FONT_STYLE.monoBold}
        >
          {pricedCount}/{totalCount}
        </Text>
      </View>
      <View className="h-px flex-1 bg-[rgba(26,20,16,0.08)]" />
    </View>
  );
}

export function ManualPriceEntrySheet({
  visible,
  onDismiss,
  onSave,
  orderItems,
  prices,
  onUpdatePrice,
  locationName,
  isSaving,
}: ManualPriceEntrySheetProps) {
  const insets = useSafeAreaInsets();

  const personGroups = useMemo(
    () => groupOrderItemsByParticipant(orderItems),
    [orderItems],
  );

  const totalItems = orderItems?.length ?? 0;
  const pricedCount = orderItems
    ? orderItems.filter((oi) => {
        const price = prices.get(oi.id);
        return price !== null && price !== undefined && price > 0;
      }).length
    : 0;

  const totalToSave = orderItems
    ? orderItems.reduce((sum, oi) => {
        const price = prices.get(oi.id);
        return sum + (price ?? 0);
      }, 0)
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View className="flex-1 bg-[#FFF7EE]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-start border-b border-[rgba(26,20,16,0.08)] px-[18px] pb-3.5 pt-4">
          <View className="flex-1">
            <BrText
              weight="bold"
              className="text-xl"
              style={BR_FONT_STYLE.display}
            >
              Enter prices
            </BrText>
            <Text
              className="mt-0.5 text-xs text-[#8A7A6E]"
              style={BR_FONT_STYLE.mono}
            >
              {locationName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onDismiss}
            className="h-9 w-9 items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="X" size={17} color={BR.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[18px] pb-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {personGroups.map(({ key, displayName, items }) => {
            const groupPriced = items.filter((oi) => {
              const price = prices.get(oi.id);
              return price !== null && price !== undefined && price > 0;
            }).length;

            return (
              <React.Fragment key={key}>
                <SectionHeader
                  title={displayName}
                  pricedCount={groupPriced}
                  totalCount={items.length}
                />
                {items.map((oi) => (
                  <PriceItemCard
                    key={oi.id}
                    orderItem={oi}
                    priceInCents={prices.get(oi.id) ?? null}
                    onUpdatePrice={onUpdatePrice}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </ScrollView>

        <View
          className="gap-3 border-t border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-[18px] pt-3.5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-[#8A7A6E]" style={BR_FONT_STYLE.mono}>
              {pricedCount} of {totalItems} priced
            </Text>
            <Text
              className="text-sm text-[#1A1410]"
              style={BR_FONT_STYLE.monoBold}
            >
              Saving: ${(totalToSave / 100).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onSave}
            disabled={isSaving || pricedCount === 0}
            activeOpacity={0.85}
            className={`flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 ${
              isSaving || pricedCount === 0 ? "opacity-55" : ""
            }`}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="Check" size={18} color="#fff" strokeWidth={3} />
            )}
            <Text className="text-base font-bold text-white">
              {isSaving
                ? "Saving…"
                : totalItems > 0 && pricedCount === totalItems
                  ? "Save prices"
                  : `Save ${pricedCount} price${pricedCount !== 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
