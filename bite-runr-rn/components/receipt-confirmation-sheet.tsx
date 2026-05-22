import type React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/common/icon";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import type { MatchedItem } from "@/hooks/useReceiptScanning";
import { groupOrderItemsByParticipant } from "@/lib/order-item-grouping";

interface OrderItem {
  id: string;
  orderUserId: string;
  text: string;
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
    priceInCents?: number | null,
  ) => void;
  receiptStoreName: string | null;
  receiptTotal: number | null;
  isSaving: boolean;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "–";
  return `$${(cents / 100).toFixed(2)}`;
}

function getEffectivePrice(
  item: MatchedItem | null | undefined,
): number | null {
  if (!item) return null;
  return item.manualPriceInCents ?? item.receiptItem.priceInCents;
}

function confidenceConfig(confidence: number) {
  if (confidence >= 0.7)
    return {
      label: "Great",
      badgeClass: "bg-[#DDF5E8]",
      textClass: "text-[#1B6B43]",
    };
  if (confidence >= 0.4)
    return {
      label: "Maybe",
      badgeClass: "bg-[#FFF1C4]",
      textClass: "text-[#7A4A20]",
    };
  return {
    label: "Review",
    badgeClass: "bg-[#FFE0E6]",
    textClass: "text-[#B82340]",
  };
}

// ── Unmatched receipt item card ────────────────────────────────────

function UnmatchedCard({
  item,
  matchedIndex,
  isSelected,
  onSelect,
}: {
  item: MatchedItem;
  matchedIndex: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(matchedIndex)}
      className={`mb-2 flex-row items-center gap-2.5 rounded-2xl border p-3 ${
        isSelected
          ? "border-[rgba(255,106,31,0.3)] bg-[#FFF1E2]"
          : "border-[rgba(26,20,16,0.08)] bg-white"
      }`}
    >
      <View
        className={`h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isSelected ? "bg-[#FFE7D4]" : "bg-[#FCEFE0]"
        }`}
      >
        <Icon
          name={isSelected ? "Check" : "Plus"}
          size={15}
          color={isSelected ? BR.orangeDeep : BR.ink3}
          strokeWidth={isSelected ? 3 : 2.5}
        />
      </View>
      <View className="flex-1">
        <Text
          className="text-[13px] text-[#1A1410]"
          style={BR_FONT_STYLE.displaySemibold}
        >
          {item.receiptItem.name}
        </Text>
        <Text
          className="mt-px text-[11px] text-[#8A7A6E]"
          style={BR_FONT_STYLE.mono}
        >
          Qty: {item.receiptItem.quantity} ·{" "}
          {formatPrice(item.receiptItem.priceInCents)}
        </Text>
        {item.receiptItem.comboName && (
          <Text className="mt-0.5 text-[11px] text-[#8A7A6E] italic">
            Split from {item.receiptItem.comboName}
          </Text>
        )}
      </View>
      {isSelected && (
        <Text
          className="text-[11px] text-[#E8551A]"
          style={BR_FONT_STYLE.displaySemibold}
        >
          Tap item below
        </Text>
      )}
    </Pressable>
  );
}

// ── Order item card ────────────────────────────────────────────────

function OrderItemCard({
  orderItem,
  linkedReceiptItem,
  matchedIndex,
  onUnlink,
  onLinkSelected,
  hasSelectedItem,
  onUpdatePrice,
}: {
  orderItem: OrderItem;
  linkedReceiptItem: MatchedItem | null;
  matchedIndex: number | null;
  onUnlink: (matchedIndex: number) => void;
  onLinkSelected: (orderItemId: string) => void;
  hasSelectedItem: boolean;
  onUpdatePrice: (matchedIndex: number, priceInCents: number | null) => void;
}) {
  const [manualPrice, setManualPrice] = useState("");
  const effectivePrice = getEffectivePrice(linkedReceiptItem);
  const isLinkable = !linkedReceiptItem && hasSelectedItem;

  const handlePriceChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, "");
    const dot = cleaned.indexOf(".");
    if (dot !== -1)
      cleaned =
        cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
    setManualPrice(cleaned);
    if (matchedIndex === null) return;
    const value = parseFloat(cleaned);
    if (!Number.isNaN(value))
      onUpdatePrice(matchedIndex, Math.round(value * 100));
    else if (cleaned === "") onUpdatePrice(matchedIndex, null);
  };

  return (
    <Pressable
      onPress={() => {
        if (isLinkable) onLinkSelected(orderItem.id);
      }}
      className={`mb-2 rounded-2xl border p-3 ${
        linkedReceiptItem
          ? "border-[rgba(46,190,123,0.2)] bg-white"
          : isLinkable
            ? "border-dashed border-[rgba(255,106,31,0.25)] bg-[#FFF1E2]"
            : "border-[rgba(26,20,16,0.08)] bg-white"
      }`}
    >
      <View className="flex-row items-start gap-2.5">
        <View
          className={`h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            linkedReceiptItem
              ? "border-transparent bg-[#DDF5E8]"
              : "border-[rgba(26,20,16,0.14)] bg-[#FCEFE0]"
          }`}
        >
          {linkedReceiptItem ? (
            <Icon name="Check" size={13} color={BR.mint} strokeWidth={3} />
          ) : isLinkable ? (
            <Icon name="ArrowDown" size={12} color={BR.orange} />
          ) : null}
        </View>
        <View className="flex-1">
          <Text
            className="text-[13px] text-[#1A1410]"
            style={BR_FONT_STYLE.displaySemibold}
          >
            {orderItem.text}
          </Text>
          {!linkedReceiptItem && (
            <Text
              className={`mt-0.5 text-[11px] italic ${
                isLinkable ? "text-[#E8551A]" : "text-[#8A7A6E]"
              }`}
            >
              {isLinkable ? "Tap to link here" : "No receipt item linked"}
            </Text>
          )}
        </View>
        {linkedReceiptItem && effectivePrice !== null && (
          <Text
            className="text-sm text-[#FF6A1F]"
            style={BR_FONT_STYLE.monoBold}
          >
            {formatPrice(effectivePrice)}
          </Text>
        )}
      </View>

      {linkedReceiptItem && (
        <View className="mt-2.5 ml-7 gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="text-[11px] text-[#8A7A6E]"
              style={BR_FONT_STYLE.mono}
            >
              Receipt:
            </Text>
            <Text
              className="flex-1 text-xs text-[#1A1410]"
              style={BR_FONT_STYLE.displaySemibold}
              numberOfLines={1}
            >
              {linkedReceiptItem.receiptItem.name}
            </Text>
            {linkedReceiptItem.confidence < 1 &&
              (() => {
                const cfg = confidenceConfig(linkedReceiptItem.confidence);
                return (
                  <View
                    className={`rounded-full px-[7px] py-0.5 ${cfg.badgeClass}`}
                  >
                    <Text
                      className={`text-[10px] ${cfg.textClass}`}
                      style={BR_FONT_STYLE.displaySemibold}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                );
              })()}
          </View>

          {linkedReceiptItem.receiptItem.comboName && (
            <View className="rounded-[10px] border border-[rgba(255,106,31,0.15)] bg-[#FFF1E2] p-2.5">
              <Text
                className="text-[11px] text-[#E8551A]"
                style={BR_FONT_STYLE.displaySemibold}
              >
                Split from {linkedReceiptItem.receiptItem.comboName}
                {linkedReceiptItem.receiptItem.comboTotalInCents != null
                  ? ` · ${formatPrice(linkedReceiptItem.receiptItem.comboTotalInCents)} combo`
                  : ""}
              </Text>
              {!!linkedReceiptItem.receiptItem.comboItems?.length && (
                <Text className="mt-0.5 text-[11px] text-[#8A7A6E]">
                  Includes{" "}
                  {linkedReceiptItem.receiptItem.comboItems.join(" · ")}
                </Text>
              )}
            </View>
          )}

          <View className="flex-row items-center gap-2">
            <View className="h-9 flex-1 flex-row items-center gap-1 rounded-[10px] border border-[rgba(26,20,16,0.14)] bg-white px-2.5">
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
                  effectivePrice !== null
                    ? (effectivePrice / 100).toFixed(2)
                    : "0.00"
                }
                placeholderTextColor={BR.ink3}
                value={manualPrice}
                onChangeText={handlePriceChange}
                keyboardType="decimal-pad"
              />
            </View>
            <TouchableOpacity
              onPress={() => matchedIndex !== null && onUnlink(matchedIndex)}
              className="h-9 items-center justify-center rounded-[10px] border border-[#FFE0E6] bg-[#FFE0E6] px-3"
            >
              <Text
                className="text-xs text-[#B82340]"
                style={BR_FONT_STYLE.displaySemibold}
              >
                Unlink
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ── Section headers ────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View className="mb-2.5 mt-[18px] flex-row items-center gap-2">
      <Text
        className="text-[10px] tracking-[1.2px] text-[#8A7A6E] uppercase"
        style={BR_FONT_STYLE.monoBold}
      >
        {title}
      </Text>
      {count !== undefined && (
        <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#FCEFE0] px-1.5">
          <Text
            className="text-[10px] text-[#8A7A6E]"
            style={BR_FONT_STYLE.monoBold}
          >
            {count}
          </Text>
        </View>
      )}
      <View className="h-px flex-1 bg-[rgba(26,20,16,0.08)]" />
    </View>
  );
}

function PersonSection({
  name,
  allMatched,
  collapsed,
  onToggle,
  children,
}: {
  name: string;
  allMatched: boolean;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const [rotation] = useState(() => new Animated.Value(collapsed ? 1 : 0));
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: collapsed ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [collapsed, rotation]);
  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["90deg", "0deg"],
  });

  return (
    <View className="mt-[18px]">
      <Pressable
        onPress={onToggle}
        className="mb-2 flex-row items-center gap-2"
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name="ChevronRight" size={13} color={BR.ink3} />
        </Animated.View>
        <Text
          className="text-[10px] tracking-wide text-[#8A7A6E] uppercase"
          style={BR_FONT_STYLE.monoBold}
        >
          {name}
        </Text>
        {allMatched && <Icon name="CircleCheck" size={13} color={BR.mint} />}
        <View className="h-px flex-1 bg-[rgba(26,20,16,0.08)]" />
      </Pressable>
      {!collapsed && children}
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────

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
  const insets = useSafeAreaInsets();
  const [selectedReceiptIndex, setSelectedReceiptIndex] = useState<
    number | null
  >(null);
  const [sectionCollapseOverrides, setSectionCollapseOverrides] = useState<
    Map<string, boolean>
  >(new Map());

  const personGroups = useMemo(
    () => groupOrderItemsByParticipant(orderItems),
    [orderItems],
  );

  const matchByOrderItemId = useMemo(() => {
    const map = new Map<string, { item: MatchedItem; index: number }>();
    matchedItems.forEach((m, i) => {
      if (m.matchedOrderItemId)
        map.set(m.matchedOrderItemId, { item: m, index: i });
    });
    return map;
  }, [matchedItems]);

  const toggleSection = useCallback(
    (participantKey: string, defaultCollapsed: boolean) => {
      setSectionCollapseOverrides((prev) => {
        const next = new Map(prev);
        const current = next.get(participantKey) ?? defaultCollapsed;
        const nextVal = !current;
        if (nextVal === defaultCollapsed) next.delete(participantKey);
        else next.set(participantKey, nextVal);
        return next;
      });
    },
    [],
  );

  const unmatchedItems = useMemo(
    () =>
      matchedItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.matchedOrderItemId),
    [matchedItems],
  );

  const totalOrderItems = orderItems?.length ?? 0;
  const pricedOrderItemCount = orderItems
    ? orderItems.filter(
        (oi) => getEffectivePrice(matchByOrderItemId.get(oi.id)?.item) !== null,
      ).length
    : 0;
  const comboSplitCount = matchedItems.filter(
    (m) => !!m.receiptItem.comboName,
  ).length;
  const allOrderItemsPriced =
    totalOrderItems > 0 && pricedOrderItemCount === totalOrderItems;
  const totalToSave = matchedItems
    .filter((m) => m.matchedOrderItemId)
    .reduce((sum, m) => sum + (getEffectivePrice(m) ?? 0), 0);

  const hasSelectedItem = selectedReceiptIndex !== null;

  const handleSelectUnmatched = (idx: number) => {
    setSelectedReceiptIndex(selectedReceiptIndex === idx ? null : idx);
  };
  const handleLinkSelected = (orderItemId: string) => {
    if (selectedReceiptIndex === null) return;
    onUpdateMatch(selectedReceiptIndex, orderItemId);
    setSelectedReceiptIndex(null);
  };
  const handleUnlink = (idx: number) => onUpdateMatch(idx, null);
  const handleUpdatePrice = (idx: number, priceInCents: number | null) => {
    const item = matchedItems[idx];
    if (item) onUpdateMatch(idx, item.matchedOrderItemId, priceInCents);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#FFF7EE]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-start border-b border-[rgba(26,20,16,0.08)] px-[18px] pb-3.5 pt-4">
          <View className="flex-1">
            <BrText weight="bold" className="text-xl">
              Review items
            </BrText>
            {receiptStoreName && (
              <Text
                className="mt-0.5 text-xs text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                {receiptStoreName}
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-2.5">
            {receiptTotal !== null && (
              <View className="rounded-full bg-[#FFE7D4] px-3 py-1.5">
                <Text
                  className="text-xs text-[#E8551A]"
                  style={BR_FONT_STYLE.monoBold}
                >
                  Total: {formatPrice(receiptTotal)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
            >
              <Icon name="X" size={17} color={BR.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {hasSelectedItem && (
          <View className="flex-row items-center gap-2 border-b border-[rgba(255,106,31,0.18)] bg-[#FFF1E2] px-[18px] py-2.5">
            <Icon name="Link" size={13} color={BR.orangeDeep} />
            <Text
              className="flex-1 text-xs text-[#E8551A]"
              style={BR_FONT_STYLE.displaySemibold}
              numberOfLines={1}
            >
              Tap an order item to link the selected receipt line
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedReceiptIndex(null)}
              className="rounded-full bg-[#FCEFE0] px-2.5 py-1"
            >
              <Text
                className="text-[11px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.displaySemibold}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {comboSplitCount > 0 && (
          <View className="mx-[18px] mt-3 flex-row items-start gap-3 rounded-2xl border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2] p-3.5">
            <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE7D4]">
              <Icon name="PackageOpen" size={16} color={BR.orangeDeep} />
            </View>
            <View className="flex-1">
              <Text
                className="text-[13px] text-[#1A1410]"
                style={BR_FONT_STYLE.displaySemibold}
              >
                Combo items were split out
              </Text>
              <Text className="mt-0.5 text-xs leading-[17px] text-[#8A7A6E]">
                Included items were separated so you can match them one by one.
                Prices start as an even split.
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[18px] pb-6"
          showsVerticalScrollIndicator={false}
        >
          {unmatchedItems.length > 0 && (
            <>
              <SectionHeader
                title={
                  allOrderItemsPriced
                    ? "Unlinked receipt lines"
                    : "Needs attention"
                }
                count={unmatchedItems.length}
              />
              {allOrderItemsPriced && (
                <Text className="mb-2 text-xs leading-[17px] text-[#8A7A6E]">
                  These can be left unmatched if they are extras, sauces, or
                  receipt-only modifiers.
                </Text>
              )}
              {unmatchedItems.map(({ item, index }) => (
                <UnmatchedCard
                  key={item.id}
                  item={item}
                  matchedIndex={index}
                  isSelected={selectedReceiptIndex === index}
                  onSelect={handleSelectUnmatched}
                />
              ))}
            </>
          )}

          {personGroups.map(({ key, displayName, items }) => {
            const matchedCount = items.filter((oi) =>
              matchByOrderItemId.has(oi.id),
            ).length;
            const allMatched =
              items.length > 0 && matchedCount === items.length;
            const collapsed = sectionCollapseOverrides.get(key) ?? allMatched;
            return (
              <PersonSection
                key={key}
                name={displayName}
                allMatched={allMatched}
                collapsed={collapsed}
                onToggle={() => toggleSection(key, allMatched)}
              >
                {items.map((oi) => {
                  const match = matchByOrderItemId.get(oi.id);
                  return (
                    <OrderItemCard
                      key={oi.id}
                      orderItem={oi}
                      linkedReceiptItem={match?.item ?? null}
                      matchedIndex={match?.index ?? null}
                      onUnlink={handleUnlink}
                      onLinkSelected={handleLinkSelected}
                      hasSelectedItem={hasSelectedItem}
                      onUpdatePrice={handleUpdatePrice}
                    />
                  );
                })}
              </PersonSection>
            );
          })}

          {allOrderItemsPriced &&
            unmatchedItems.length === 0 &&
            personGroups.length > 0 && (
              <View className="mt-3.5 items-center gap-2 rounded-2xl border border-[#DDF5E8] bg-[#DDF5E8] py-[22px]">
                <Icon name="CircleCheck" size={26} color={BR.mint} />
                <Text
                  className="text-sm text-[#1B6B43]"
                  style={BR_FONT_STYLE.displaySemibold}
                >
                  All order items priced!
                </Text>
              </View>
            )}
        </ScrollView>

        <View
          className="gap-3 border-t border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-[18px] pt-3.5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-[#8A7A6E]" style={BR_FONT_STYLE.mono}>
              {pricedOrderItemCount} of {totalOrderItems} items priced
            </Text>
            <Text
              className="text-sm text-[#1A1410]"
              style={BR_FONT_STYLE.monoBold}
            >
              Saving: {formatPrice(totalToSave)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={isSaving || pricedOrderItemCount === 0}
            activeOpacity={0.85}
            className={`flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 ${
              isSaving || pricedOrderItemCount === 0 ? "opacity-55" : ""
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
                : totalOrderItems > 0 &&
                    pricedOrderItemCount === totalOrderItems
                  ? "Save prices"
                  : `Save ${pricedOrderItemCount} price${pricedOrderItemCount !== 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
