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
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/common/icon";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
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
    return { label: "Great", bg: BR.mintSoft, fg: BR.mintInk };
  if (confidence >= 0.4)
    return { label: "Maybe", bg: BR.yolkSoft, fg: "#7A4A20" };
  return { label: "Review", bg: BR.coralSoft, fg: BR.coralInk };
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
      style={[styles.unmatchedCard, isSelected && styles.unmatchedCardSelected]}
    >
      <View
        style={[
          styles.unmatchedIconCircle,
          isSelected && { backgroundColor: BR.orangeSoft },
        ]}
      >
        <Icon
          name={isSelected ? "Check" : "Plus"}
          size={15}
          color={isSelected ? BR.orangeDeep : BR.ink3}
          strokeWidth={isSelected ? 3 : 2.5}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.unmatchedName}>{item.receiptItem.name}</Text>
        <Text style={styles.unmatchedMeta}>
          Qty: {item.receiptItem.quantity} ·{" "}
          {formatPrice(item.receiptItem.priceInCents)}
        </Text>
        {item.receiptItem.comboName && (
          <Text style={styles.unmatchedCombo}>
            Split from {item.receiptItem.comboName}
          </Text>
        )}
      </View>
      {isSelected && <Text style={styles.unmatchedHint}>Tap item below</Text>}
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
      style={[
        styles.orderItemCard,
        isLinkable && styles.orderItemCardLinkable,
        linkedReceiptItem && styles.orderItemCardLinked,
      ]}
    >
      {/* Status circle + item name */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View
          style={[
            styles.statusCircle,
            linkedReceiptItem && { backgroundColor: BR.mintSoft },
          ]}
        >
          {linkedReceiptItem ? (
            <Icon name="Check" size={13} color={BR.mint} strokeWidth={3} />
          ) : isLinkable ? (
            <Icon name="ArrowDown" size={12} color={BR.orange} />
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderItemName}>{orderItem.text}</Text>
          {!linkedReceiptItem && (
            <Text
              style={[
                styles.orderItemHint,
                isLinkable && { color: BR.orangeDeep },
              ]}
            >
              {isLinkable ? "Tap to link here" : "No receipt item linked"}
            </Text>
          )}
        </View>
        {linkedReceiptItem && effectivePrice !== null && (
          <Text style={styles.orderItemPrice}>
            {formatPrice(effectivePrice)}
          </Text>
        )}
      </View>

      {/* Linked details */}
      {linkedReceiptItem && (
        <View style={{ marginTop: 10, marginLeft: 28, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.receiptLabel}>Receipt:</Text>
            <Text style={styles.receiptItemName} numberOfLines={1}>
              {linkedReceiptItem.receiptItem.name}
            </Text>
            {linkedReceiptItem.confidence < 1 &&
              (() => {
                const cfg = confidenceConfig(linkedReceiptItem.confidence);
                return (
                  <View
                    style={[
                      styles.confidenceBadge,
                      { backgroundColor: cfg.bg },
                    ]}
                  >
                    <Text style={[styles.confidenceText, { color: cfg.fg }]}>
                      {cfg.label}
                    </Text>
                  </View>
                );
              })()}
          </View>

          {linkedReceiptItem.receiptItem.comboName && (
            <View style={styles.comboNote}>
              <Text style={styles.comboNoteText}>
                Split from {linkedReceiptItem.receiptItem.comboName}
                {linkedReceiptItem.receiptItem.comboTotalInCents != null
                  ? ` · ${formatPrice(linkedReceiptItem.receiptItem.comboTotalInCents)} combo`
                  : ""}
              </Text>
              {!!linkedReceiptItem.receiptItem.comboItems?.length && (
                <Text style={styles.comboNoteSubtext}>
                  Includes{" "}
                  {linkedReceiptItem.receiptItem.comboItems.join(" · ")}
                </Text>
              )}
            </View>
          )}

          {/* Price edit + unlink */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={styles.priceInputRow}>
              <Text style={styles.priceInputDollar}>$</Text>
              <TextInput
                style={styles.priceInput}
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
              style={styles.unlinkBtn}
            >
              <Text style={styles.unlinkText}>Unlink</Text>
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
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {count !== undefined && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
      <View style={styles.sectionLine} />
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
    <View style={{ marginTop: 18 }}>
      <Pressable onPress={onToggle} style={styles.personHeader}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name="ChevronRight" size={13} color={BR.ink3} />
        </Animated.View>
        <Text style={styles.personName}>{name}</Text>
        {allMatched && <Icon name="CircleCheck" size={13} color={BR.mint} />}
        <View style={styles.sectionLine} />
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
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <BrText weight="bold" style={{ fontSize: 20 }}>
              Review items
            </BrText>
            {receiptStoreName && (
              <Text
                style={{
                  fontSize: 12,
                  color: BR.ink3,
                  marginTop: 2,
                  fontFamily: BR_FONT.mono,
                }}
              >
                {receiptStoreName}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {receiptTotal !== null && (
              <View style={styles.receiptTotalBadge}>
                <Text style={styles.receiptTotalText}>
                  Total: {formatPrice(receiptTotal)}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="X" size={17} color={BR.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Linking banner */}
        {hasSelectedItem && (
          <View style={styles.linkingBanner}>
            <Icon name="Link" size={13} color={BR.orangeDeep} />
            <Text style={styles.linkingBannerText} numberOfLines={1}>
              Tap an order item to link the selected receipt line
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedReceiptIndex(null)}
              style={styles.linkingCancelBtn}
            >
              <Text style={styles.linkingCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Combo note */}
        {comboSplitCount > 0 && (
          <View style={styles.comboInfoCard}>
            <View style={styles.comboInfoIcon}>
              <Icon name="PackageOpen" size={16} color={BR.orangeDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.comboInfoTitle}>
                Combo items were split out
              </Text>
              <Text style={styles.comboInfoBody}>
                Included items were separated so you can match them one by one.
                Prices start as an even split.
              </Text>
            </View>
          </View>
        )}

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
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
                <Text style={styles.unmatchedNote}>
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
              <View style={styles.allMatchedBanner}>
                <Icon name="CircleCheck" size={26} color={BR.mint} />
                <Text style={styles.allMatchedText}>
                  All order items priced!
                </Text>
              </View>
            )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.modalFooter,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <View style={styles.footerStats}>
            <Text style={styles.footerStatsText}>
              {pricedOrderItemCount} of {totalOrderItems} lines priced
            </Text>
            <Text style={styles.footerTotalText}>
              Saving: {formatPrice(totalToSave)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={isSaving || pricedOrderItemCount === 0}
            activeOpacity={0.85}
            style={[
              styles.saveBtn,
              (isSaving || pricedOrderItemCount === 0) && { opacity: 0.55 },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="Check" size={18} color="#fff" strokeWidth={3} />
            )}
            <Text style={styles.saveBtnText}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BR.paper,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BR.line,
  },
  receiptTotalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
  },
  receiptTotalText: {
    fontSize: 12,
    fontWeight: "700",
    color: BR.orangeDeep,
    fontFamily: BR_FONT.mono,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
    alignItems: "center",
    justifyContent: "center",
  },
  linkingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: BR.orangeTint,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,106,31,0.18)",
  },
  linkingBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: BR.orangeDeep,
  },
  linkingCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: BR.paper2,
  },
  linkingCancelText: {
    fontSize: 11,
    fontWeight: "600",
    color: BR.ink3,
  },
  comboInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 18,
    marginTop: 12,
    padding: 14,
    backgroundColor: BR.orangeTint,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,106,31,0.18)",
  },
  comboInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: BR.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  comboInfoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: BR.ink,
  },
  comboInfoBody: {
    fontSize: 12,
    color: BR.ink3,
    marginTop: 3,
    lineHeight: 17,
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: BR_FONT.monoBold,
    color: BR.ink3,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: BR.line,
  },
  // Person section
  personHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  personName: {
    fontSize: 10,
    fontFamily: BR_FONT.monoBold,
    color: BR.ink3,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  personBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  personBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  // Unmatched card
  unmatchedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
  },
  unmatchedCardSelected: {
    backgroundColor: BR.orangeTint,
    borderColor: "rgba(255,106,31,0.3)",
  },
  unmatchedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  unmatchedName: {
    fontSize: 13,
    fontWeight: "600",
    color: BR.ink,
  },
  unmatchedMeta: {
    fontSize: 11,
    color: BR.ink3,
    marginTop: 1,
    fontFamily: BR_FONT.mono,
  },
  unmatchedCombo: {
    fontSize: 11,
    color: BR.ink3,
    marginTop: 2,
    fontStyle: "italic",
  },
  unmatchedHint: {
    fontSize: 11,
    fontWeight: "600",
    color: BR.orangeDeep,
  },
  unmatchedNote: {
    fontSize: 12,
    color: BR.ink3,
    lineHeight: 17,
    marginBottom: 8,
  },
  // Order item card
  orderItemCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
  },
  orderItemCardLinkable: {
    backgroundColor: BR.orangeTint,
    borderColor: "rgba(255,106,31,0.25)",
    borderStyle: "dashed",
  },
  orderItemCardLinked: {
    borderColor: "rgba(46,190,123,0.2)",
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: BR.ink,
  },
  orderItemHint: {
    fontSize: 11,
    color: BR.ink3,
    marginTop: 2,
    fontStyle: "italic",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: BR.orange,
    fontFamily: BR_FONT.monoBold,
  },
  receiptLabel: {
    fontSize: 11,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  receiptItemName: {
    fontSize: 12,
    fontWeight: "600",
    color: BR.ink,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: "700",
  },
  comboNote: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: BR.orangeTint,
    borderWidth: 1,
    borderColor: "rgba(255,106,31,0.15)",
  },
  comboNoteText: {
    fontSize: 11,
    fontWeight: "600",
    color: BR.orangeDeep,
  },
  comboNoteSubtext: {
    fontSize: 11,
    color: BR.ink3,
    marginTop: 2,
  },
  priceInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BR.line2,
    backgroundColor: BR.card,
    gap: 4,
  },
  priceInputDollar: {
    fontSize: 13,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  priceInput: {
    flex: 1,
    fontSize: 13,
    color: BR.ink,
    fontFamily: BR_FONT.displayMedium,
    letterSpacing: 0,
    padding: 0,
    includeFontPadding: false,
  },
  unlinkBtn: {
    height: 36,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BR.coralSoft,
    backgroundColor: BR.coralSoft,
  },
  unlinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: BR.coralInk,
  },
  // All matched banner
  allMatchedBanner: {
    alignItems: "center",
    paddingVertical: 22,
    marginTop: 14,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.mintSoft,
    backgroundColor: BR.mintSoft,
    gap: 8,
  },
  allMatchedText: {
    fontSize: 14,
    fontWeight: "700",
    color: BR.mintInk,
  },
  // Footer
  modalFooter: {
    paddingHorizontal: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BR.line,
    gap: 12,
    backgroundColor: BR.paper,
  },
  footerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerStatsText: {
    fontSize: 12,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  footerTotalText: {
    fontSize: 14,
    fontWeight: "700",
    color: BR.ink,
    fontFamily: BR_FONT.monoBold,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orange,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
