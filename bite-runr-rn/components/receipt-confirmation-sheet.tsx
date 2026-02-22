import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Pressable,
    Modal,
    SafeAreaView,
    Animated,
} from "react-native";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
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
        priceInCents?: number | null,
    ) => void;
    receiptStoreName: string | null;
    receiptTotal: number | null;
    isSaving: boolean;
}

function formatPrice(cents: number | null): string {
    if (cents === null) return "-";
    return `$${(cents / 100).toFixed(2)}`;
}

// --- Unmatched Receipt Item Card ---
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
            className={`mb-2 overflow-hidden border rounded-xl ${
                isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
            }`}
        >
            <View className="flex-row items-center p-3">
                <View className="items-center justify-center w-8 h-8 mr-3 rounded-full bg-muted">
                    {isSelected ? (
                        <Icon name="Check" size={16} color="#f97316" />
                    ) : (
                        <Icon name="Plus" size={16} color="#999" />
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">
                        {item.receiptItem.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                        Qty: {item.receiptItem.quantity} · {formatPrice(item.receiptItem.priceInCents)}
                    </Text>
                </View>
                {isSelected && (
                    <Text className="text-xs font-medium text-primary">
                        Now tap an item below
                    </Text>
                )}
            </View>
        </Pressable>
    );
}

// --- Order Item Card (under a person section) ---
function OrderItemCard({
    orderItem,
    linkedReceiptItem,
    matchedIndex,
    onUnlink,
    onLinkSelected,
    hasSelectedItem,
    onUpdatePrice,
    colorScheme,
}: {
    orderItem: OrderItem;
    linkedReceiptItem: MatchedItem | null;
    matchedIndex: number | null;
    onUnlink: (matchedIndex: number) => void;
    onLinkSelected: (orderItemId: string) => void;
    hasSelectedItem: boolean;
    onUpdatePrice: (matchedIndex: number, priceInCents: number | null) => void;
    colorScheme: "light" | "dark";
}) {
    const [manualPrice, setManualPrice] = useState("");

    const handlePriceChange = (text: string) => {
        let cleaned = text.replace(/[^0-9.]/g, "");
        const decimalIndex = cleaned.indexOf(".");
        if (decimalIndex !== -1) {
            cleaned =
                cleaned.slice(0, decimalIndex + 1) +
                cleaned.slice(decimalIndex + 1).replace(/\./g, "");
        }
        setManualPrice(cleaned);

        if (matchedIndex === null) return;
        const value = parseFloat(cleaned);
        if (!isNaN(value)) {
            onUpdatePrice(matchedIndex, Math.round(value * 100));
        } else if (cleaned === "") {
            onUpdatePrice(matchedIndex, null);
        }
    };

    const effectivePrice = linkedReceiptItem
        ? (linkedReceiptItem.manualPriceInCents ?? linkedReceiptItem.receiptItem.priceInCents)
        : null;

    return (
        <Pressable
            onPress={() => {
                if (!linkedReceiptItem && hasSelectedItem) {
                    onLinkSelected(orderItem.id);
                }
            }}
            className={`mb-2 overflow-hidden border rounded-xl ${
                !linkedReceiptItem && hasSelectedItem
                    ? "border-primary/50 border-dashed bg-primary/5"
                    : "border-border bg-card"
            }`}
        >
            <View className="p-3">
                {/* Order item name + match status */}
                <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center flex-1 gap-2">
                        {linkedReceiptItem ? (
                            <View className="items-center justify-center w-6 h-6 rounded-full bg-green-500/20">
                                <Icon name="Check" size={14} color="#22c55e" />
                            </View>
                        ) : (
                            <View className="items-center justify-center w-6 h-6 border border-dashed rounded-full border-muted-foreground/30">
                                {hasSelectedItem && (
                                    <Icon name="ArrowDown" size={12} color={NAV_THEME[colorScheme].primary} />
                                )}
                            </View>
                        )}
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-foreground">
                                {orderItem.itemName}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                                Qty: {orderItem.quantity}
                            </Text>
                        </View>
                    </View>

                    {linkedReceiptItem && effectivePrice !== null && (
                        <Text className="text-sm font-semibold text-primary">
                            {formatPrice(effectivePrice)}
                        </Text>
                    )}
                </View>

                {linkedReceiptItem ? (
                    <>
                        {/* Matched receipt item info */}
                        <View className="flex-row items-center gap-2 mt-2 ml-8">
                            <Text className="text-xs text-muted-foreground">
                                Receipt:
                            </Text>
                            <Text className="flex-1 text-xs font-medium text-foreground">
                                {linkedReceiptItem.receiptItem.name}
                            </Text>
                            {/* Confidence badge */}
                            {linkedReceiptItem.confidence < 1 && (
                                <View
                                    className={`px-1.5 py-0.5 rounded-full ${
                                        linkedReceiptItem.confidence >= 0.7
                                            ? "bg-green-500/20"
                                            : linkedReceiptItem.confidence >= 0.4
                                              ? "bg-yellow-500/20"
                                              : "bg-red-500/20"
                                    }`}
                                >
                                    <Text
                                        className={`text-[10px] ${
                                            linkedReceiptItem.confidence >= 0.7
                                                ? "text-green-500"
                                                : linkedReceiptItem.confidence >= 0.4
                                                  ? "text-yellow-500"
                                                  : "text-red-500"
                                        }`}
                                    >
                                        {linkedReceiptItem.confidence >= 0.7
                                            ? "Great"
                                            : linkedReceiptItem.confidence >= 0.4
                                              ? "Maybe"
                                              : "Review"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Price edit + Unlink */}
                        <View className="flex-row items-center gap-2 mt-2 ml-8">
                            <View className="flex-row items-center flex-1 h-9 px-2.5 border rounded-lg border-input bg-background">
                                <Text className="text-xs text-muted-foreground">$</Text>
                                <TextInput
                                    className="flex-1 px-1 text-xs text-foreground"
                                    placeholder={
                                        effectivePrice !== null
                                            ? (effectivePrice / 100).toFixed(2)
                                            : "0.00"
                                    }
                                    placeholderTextColor={NAV_THEME[colorScheme].border}
                                    value={manualPrice}
                                    onChangeText={handlePriceChange}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <TouchableOpacity
                                onPress={() => matchedIndex !== null && onUnlink(matchedIndex)}
                                className="h-9 px-3 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10"
                            >
                                <Text className="text-xs font-medium text-destructive">Unlink</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <View className="mt-1 ml-8">
                        {hasSelectedItem ? (
                            <Text className="text-xs font-medium text-primary">
                                Tap to link here
                            </Text>
                        ) : (
                            <Text className="text-xs italic text-muted-foreground">
                                No receipt item linked
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </Pressable>
    );
}

// --- Section Header (non-collapsible, for "Needs Attention") ---
function SectionHeader({ title, count }: { title: string; count?: number }) {
    return (
        <View className="flex-row items-center gap-2 mt-4 mb-2">
            <Text className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {title}
            </Text>
            {count !== undefined && (
                <View className="px-1.5 min-w-[20px] h-5 rounded-full bg-muted items-center justify-center">
                    <Text className="text-[10px] font-bold text-muted-foreground">
                        {count}
                    </Text>
                </View>
            )}
            <View className="flex-1 h-px bg-border" />
        </View>
    );
}

// --- Collapsible Person Section ---
function PersonSection({
    name,
    matchedCount,
    totalCount,
    allMatched,
    collapsed,
    onToggle,
    children,
}: {
    name: string;
    matchedCount: number;
    totalCount: number;
    allMatched: boolean;
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    const rotation = useRef(new Animated.Value(collapsed ? 1 : 0)).current;

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
        <View className="mt-4">
            <Pressable
                onPress={onToggle}
                className="flex-row items-center gap-2 mb-2"
            >
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Icon name="ChevronRight" size={14} color="#999" />
                </Animated.View>
                <Text className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    {name}
                </Text>
                <View
                    className={`px-1.5 min-w-[20px] h-5 rounded-full items-center justify-center ${
                        allMatched ? "bg-green-500/20" : "bg-muted"
                    }`}
                >
                    <Text
                        className={`text-[10px] font-bold ${
                            allMatched
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                        }`}
                    >
                        {matchedCount}/{totalCount}
                    </Text>
                </View>
                {allMatched && (
                    <Icon name="CircleCheck" size={14} color="#22c55e" />
                )}
                <View className="flex-1 h-px bg-border" />
            </Pressable>
            {!collapsed && children}
        </View>
    );
}

// --- Main Component ---
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
    const { colorScheme } = useColorScheme();
    const [selectedReceiptIndex, setSelectedReceiptIndex] = useState<number | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const prevAllMatchedRef = useRef<Set<string>>(new Set());

    // Group order items by person
    const personGroups = useMemo(() => {
        if (!orderItems) return [];
        const groupMap = new Map<string, OrderItem[]>();
        for (const oi of orderItems) {
            const existing = groupMap.get(oi.userName);
            if (existing) {
                existing.push(oi);
            } else {
                groupMap.set(oi.userName, [oi]);
            }
        }
        return [...groupMap.entries()].map(([name, items]) => ({ name, items }));
    }, [orderItems]);

    // Build a lookup: orderItemId → { matchedItem, matchedIndex }
    const matchByOrderItemId = useMemo(() => {
        const map = new Map<string, { item: MatchedItem; index: number }>();
        matchedItems.forEach((m, i) => {
            if (m.matchedOrderItemId) {
                map.set(m.matchedOrderItemId, { item: m, index: i });
            }
        });
        return map;
    }, [matchedItems]);

    // Auto-collapse person sections when all their items become matched
    useEffect(() => {
        const nowAllMatched = new Set<string>();
        for (const { name, items } of personGroups) {
            if (items.length > 0 && items.every((oi) => matchByOrderItemId.has(oi.id))) {
                nowAllMatched.add(name);
            }
        }

        const newlyCompleted: string[] = [];
        for (const name of nowAllMatched) {
            if (!prevAllMatchedRef.current.has(name)) {
                newlyCompleted.push(name);
            }
        }

        if (newlyCompleted.length > 0) {
            setCollapsedSections((prev) => {
                const next = new Set(prev);
                for (const name of newlyCompleted) {
                    next.add(name);
                }
                return next;
            });
        }

        prevAllMatchedRef.current = nowAllMatched;
    }, [personGroups, matchByOrderItemId]);

    const toggleSection = useCallback((name: string) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    }, []);

    // Unmatched receipt items
    const unmatchedItems = useMemo(() => {
        return matchedItems
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => !item.matchedOrderItemId);
    }, [matchedItems]);

    const validMatchCount = matchedItems.filter(
        (m) =>
            m.matchedOrderItemId &&
            (m.manualPriceInCents ?? m.receiptItem.priceInCents) !== null,
    ).length;

    const totalToSave = matchedItems
        .filter((m) => m.matchedOrderItemId)
        .reduce(
            (sum, m) =>
                sum + (m.manualPriceInCents ?? m.receiptItem.priceInCents ?? 0),
            0,
        );

    const handleSelectUnmatched = (matchedIndex: number) => {
        setSelectedReceiptIndex(
            selectedReceiptIndex === matchedIndex ? null : matchedIndex,
        );
    };

    const handleLinkSelected = (orderItemId: string) => {
        if (selectedReceiptIndex === null) return;
        onUpdateMatch(selectedReceiptIndex, orderItemId);
        setSelectedReceiptIndex(null);
    };

    const handleUnlink = (matchedIndex: number) => {
        onUpdateMatch(matchedIndex, null);
    };

    const handleUpdatePrice = (matchedIndex: number, priceInCents: number | null) => {
        const item = matchedItems[matchedIndex];
        if (item) {
            onUpdateMatch(matchedIndex, item.matchedOrderItemId, priceInCents);
        }
    };

    const hasSelectedItem = selectedReceiptIndex !== null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <SafeAreaView
                className="flex-1"
                style={{
                    backgroundColor:
                        colorScheme === "dark"
                            ? "hsl(0, 0%, 7%)"
                            : "hsl(0, 0%, 96%)",
                }}
            >
                {/* Header */}
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-foreground">
                                Confirm Receipt Items
                            </Text>
                            {receiptStoreName && (
                                <Text className="text-sm text-muted-foreground">
                                    {receiptStoreName}
                                </Text>
                            )}
                        </View>
                        <View className="flex-row items-center gap-3">
                            {receiptTotal !== null && (
                                <View className="px-3 py-1 rounded-full bg-primary/20">
                                    <Text className="text-sm font-medium text-primary">
                                        Total: {formatPrice(receiptTotal)}
                                    </Text>
                                </View>
                            )}
                            <TouchableOpacity
                                onPress={onClose}
                                className="items-center justify-center w-8 h-8 rounded-full bg-muted"
                            >
                                <Icon
                                    name="X"
                                    size={18}
                                    color={NAV_THEME[colorScheme].text}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Linking banner */}
                {hasSelectedItem && (
                    <View className="flex-row items-center px-4 py-2.5 bg-primary/10 border-b border-primary/20">
                        <Icon name="Link" size={14} color={NAV_THEME[colorScheme].primary} />
                        <Text className="flex-1 ml-2 text-xs font-medium text-primary" numberOfLines={1}>
                            Linking "{matchedItems[selectedReceiptIndex]?.receiptItem.name}" — tap an order item
                        </Text>
                        <TouchableOpacity
                            onPress={() => setSelectedReceiptIndex(null)}
                            className="px-2 py-1 ml-2 rounded-md bg-muted"
                        >
                            <Text className="text-xs font-medium text-muted-foreground">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Single scrollable list */}
                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                >
                    {/* Unmatched section (only if there are unmatched items) */}
                    {unmatchedItems.length > 0 && (
                        <>
                            <SectionHeader title="Needs Attention" count={unmatchedItems.length} />
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

                    {/* Person sections */}
                    {personGroups.map(({ name, items }) => {
                        const matchedCount = items.filter((oi) => matchByOrderItemId.has(oi.id)).length;
                        const allMatched = items.length > 0 && matchedCount === items.length;
                        return (
                            <PersonSection
                                key={name}
                                name={name}
                                matchedCount={matchedCount}
                                totalCount={items.length}
                                allMatched={allMatched}
                                collapsed={collapsedSections.has(name)}
                                onToggle={() => toggleSection(name)}
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
                                            colorScheme={colorScheme}
                                        />
                                    );
                                })}
                            </PersonSection>
                        );
                    })}

                    {/* All matched empty state */}
                    {unmatchedItems.length === 0 && personGroups.length > 0 && (
                        <View className="items-center py-6 mt-2 border border-dashed rounded-xl border-green-500/30 bg-green-500/5">
                            <Icon name="CircleCheck" size={28} color="#22c55e" />
                            <Text className="mt-2 text-sm font-medium text-foreground">
                                All receipt items matched!
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Footer */}
                <View className="px-4 py-3 border-t border-border">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm text-muted-foreground">
                            {validMatchCount} of {matchedItems.length} matched
                        </Text>
                        <Text className="text-base font-semibold text-foreground">
                            Saving: {formatPrice(totalToSave)}
                        </Text>
                    </View>
                    <Button
                        label={
                            isSaving
                                ? "Saving..."
                                : `Save ${validMatchCount} Price${validMatchCount !== 1 ? "s" : ""}`
                        }
                        onPress={onConfirm}
                        disabled={isSaving || validMatchCount === 0}
                        loading={isSaving}
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
}
