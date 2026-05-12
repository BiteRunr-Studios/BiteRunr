import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/common/icon";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
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
        if (!isNaN(value)) {
            onUpdatePrice(orderItem.id, Math.round(value * 100));
        } else if (cleaned === "") {
            onUpdatePrice(orderItem.id, null);
        }
    };

    const hasPrice = priceInCents !== null && priceInCents > 0;

    return (
        <View
            style={[
                styles.itemCard,
                hasPrice && styles.itemCardPriced,
            ]}
        >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View
                    style={[
                        styles.statusCircle,
                        hasPrice && { backgroundColor: BR.mintSoft, borderColor: "transparent" },
                    ]}
                >
                    {hasPrice ? (
                        <Icon name="Check" size={13} color={BR.mint} strokeWidth={3} />
                    ) : null}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{orderItem.text}</Text>
                </View>
            </View>

            <View style={{ marginTop: 10, marginLeft: 34 }}>
                <View style={styles.priceInputRow}>
                    <Text style={styles.priceInputDollar}>$</Text>
                    <TextInput
                        style={styles.priceInput}
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
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{title}</Text>
            <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                    {pricedCount}/{totalCount}
                </Text>
            </View>
            <View style={styles.sectionLine} />
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
            <View style={[styles.root, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                        <BrText weight="bold" style={{ fontSize: 20 }}>
                            Enter prices
                        </BrText>
                        <Text style={styles.headerSubtitle}>{locationName}</Text>
                    </View>
                    <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                        <Icon name="X" size={17} color={BR.ink} />
                    </TouchableOpacity>
                </View>

                {/* Body */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
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

                {/* Footer */}
                <View
                    style={[
                        styles.modalFooter,
                        { paddingBottom: Math.max(insets.bottom, 16) + 4 },
                    ]}
                >
                    <View style={styles.footerStats}>
                        <Text style={styles.footerStatsText}>
                            {pricedCount} of {totalItems} priced
                        </Text>
                        <Text style={styles.footerTotalText}>
                            Saving: ${(totalToSave / 100).toFixed(2)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={onSave}
                        disabled={isSaving || pricedCount === 0}
                        activeOpacity={0.85}
                        style={[
                            styles.saveBtn,
                            (isSaving || pricedCount === 0) && { opacity: 0.55 },
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
    headerSubtitle: {
        fontSize: 12,
        color: BR.ink3,
        marginTop: 2,
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
    itemCard: {
        padding: 12,
        marginBottom: 8,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
    },
    itemCardPriced: {
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
    itemName: {
        fontSize: 13,
        fontWeight: "600",
        color: BR.ink,
    },
    priceInputRow: {
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
