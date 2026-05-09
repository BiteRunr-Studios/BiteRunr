import { useLocalSearchParams, router } from "expo-router";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import Animated, { FadeInUp } from "react-native-reanimated";
import { BrAvatar, BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme"; // BR_RADIUS used by participant cards
import { useState, useCallback } from "react";

const TOOTH_W = 9;
const TOOTH_H = 7;

function TornEdge({ position }: { position: "top" | "bottom" }) {
    const { width } = useWindowDimensions();
    const count = Math.ceil(width / TOOTH_W) + 2;
    return (
        <View style={{ height: TOOTH_H, backgroundColor: BR.paper, flexDirection: "row", overflow: "hidden" }}>
            {Array.from({ length: count }).map((_, i) => (
                <View
                    key={i}
                    style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: TOOTH_W / 2,
                        borderRightWidth: TOOTH_W / 2,
                        borderLeftColor: "transparent",
                        borderRightColor: "transparent",
                        ...(position === "top"
                            ? { borderBottomWidth: TOOTH_H, borderBottomColor: BR.card }
                            : { borderTopWidth: TOOTH_H, borderTopColor: BR.card }),
                    }}
                />
            ))}
        </View>
    );
}

const SETTLEMENT_CONFIG: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
    confirmed: { label: "Settled", bg: BR.mintSoft, fg: BR.mintInk, dot: BR.mint },
    settled_in_person: { label: "Settled", bg: BR.mintSoft, fg: BR.mintInk, dot: BR.mint },
    claimed: { label: "Pending", bg: BR.yolkSoft, fg: "#7A4A20", dot: BR.yolk },
    unpaid: { label: "Unpaid", bg: BR.coralSoft, fg: BR.coralInk, dot: BR.coral },
};

function Rule() {
    return <View style={{ height: 1, backgroundColor: "rgba(26,20,16,0.1)", marginVertical: 14 }} />;
}

export default function CompletedOrder() {
    const { orderId } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpanded = useCallback((id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    const data = useQuery(
        api.orders.getCompletedOrderDetails,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    if (!orderId || data === null) {
        return (
            <View style={{ flex: 1, backgroundColor: BR.paper, paddingTop: insets.top }}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Icon name="ChevronLeft" size={20} color={BR.ink} />
                    </Pressable>
                    <View style={styles.completedBadge}>
                        <Icon name="Check" size={12} color={BR.mintInk} strokeWidth={3} />
                        <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                </View>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <BrText style={{ color: BR.ink3 }}>This order is no longer available.</BrText>
                </View>
            </View>
        );
    }

    if (data === undefined) {
        return (
            <View style={{ flex: 1, backgroundColor: BR.paper, paddingTop: insets.top }}>
                <View style={styles.header}>
                    <View style={styles.backBtn} />
                </View>
                <Skeleton>
                    <View style={{ paddingHorizontal: 18, gap: 16, marginTop: 8 }}>
                        <SkeletonBlock width={200} height={48} rounded="rounded-xl" />
                        <SkeletonBlock width={160} height={14} rounded="rounded-md" />
                        <SkeletonBlock width="100%" height={210} rounded="rounded-3xl" />
                        <SkeletonBlock width={60} height={12} rounded="rounded-md" />
                        <SkeletonBlock width="100%" height={72} rounded="rounded-2xl" />
                        <SkeletonBlock width={120} height={12} rounded="rounded-md" />
                        {[1, 2].map((i) => (
                            <SkeletonBlock key={i} width="100%" height={80} rounded="rounded-2xl" />
                        ))}
                    </View>
                </Skeleton>
            </View>
        );
    }

    const d = new Date(data.order.createdAt);
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const monthStr = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate();
    const year = d.getFullYear();
    const dateLabel = `${weekday} · ${monthStr} ${day}, ${year}`;

    const nameCode = (data.order.name || "RUN").toUpperCase().replace(/\s+/g, "").slice(0, 4);
    const receiptCode = `BR-${nameCode}-${d.getMonth() + 1}M${String(day).padStart(2, "0")}`;

    const runner = data.participants.find((p) => p.isCreator);
    const participants = data.participants.filter((p) => !p.isCreator);
    const allSettled = participants.every(
        (p) => p.settlementStatus === "confirmed" || p.settlementStatus === "settled_in_person",
    );
    const locationName = data.locations[0]?.name ?? data.order.name;

    return (
        <View style={{ flex: 1, backgroundColor: BR.paper, paddingTop: insets.top }}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Icon name="ChevronLeft" size={20} color={BR.ink} />
                </Pressable>
                <View style={styles.completedBadge}>
                    <Icon name="Check" size={12} color={BR.mintInk} strokeWidth={3} />
                    <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Page title */}
                <Animated.View entering={FadeInUp.duration(300)}>
                    <Text style={styles.pageTitle}>{data.order.name}</Text>
                    <Text style={styles.pageDate}>{dateLabel}</Text>
                </Animated.View>

                {/* Receipt card */}
                <Animated.View entering={FadeInUp.duration(300).delay(60)} style={{ marginTop: 22 }}>
                    <TornEdge position="top" />
                    <View style={styles.receipt}>
                        <View style={{ alignItems: "center" }}>
                            <Text style={styles.receiptTitle}>{locationName}</Text>
                            <Text style={styles.receiptSubtitle}>
                                {`· RUN COMPLETE · ${allSettled ? "ALL SETTLED" : "SETTLEMENT PENDING"} ·`}
                            </Text>
                        </View>

                        <Rule />

                        {/* Stats row */}
                        <View style={{ flexDirection: "row" }}>
                            <View style={styles.statCell}>
                                <Text style={styles.statNumber}>{data.stats.totalItems}</Text>
                                <Text style={styles.statLabel}>LINES</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCell}>
                                <Text style={styles.statNumber}>{data.stats.participantCount}</Text>
                                <Text style={styles.statLabel}>PEOPLE</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCell}>
                                <Text style={[styles.statNumber, { color: BR.orange }]}>
                                    ${(data.stats.totalAmount / 100).toFixed(2)}
                                </Text>
                                <Text style={styles.statLabel}>TOTAL</Text>
                            </View>
                        </View>

                        <Rule />

                        {/* Receipt code + dots */}
                        <View style={{ alignItems: "center" }}>
                            <Text style={styles.receiptCode}>{receiptCode}</Text>
                            <Text style={[styles.receiptCode, { marginTop: 6, letterSpacing: 5 }]}>
                                · · · · · ·
                            </Text>
                        </View>
                    </View>
                    <TornEdge position="bottom" />
                </Animated.View>

                {/* Runner */}
                {runner && (
                    <Animated.View entering={FadeInUp.duration(300).delay(120)} style={{ marginTop: 28 }}>
                        <Text style={styles.sectionLabel}>RUNNER</Text>
                        <View style={[styles.participantCard, styles.runnerCard]}>
                            <View style={styles.participantRow}>
                                <BrAvatar
                                    name={`${runner.firstName} ${runner.lastName}`.trim() || "R"}
                                    avatarUrl={runner.avatarUrl ?? null}
                                    size={44}
                                />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.participantName}>
                                        {`${runner.firstName} ${runner.lastName}`.trim()}
                                    </Text>
                                    <Text style={styles.participantMeta}>
                                        {runner.itemCount} {runner.itemCount === 1 ? "line" : "lines"} · drove the run
                                    </Text>
                                </View>
                                <View style={styles.runnerPill}>
                                    <View style={styles.runnerPillCircle} />
                                    <Text style={styles.runnerPillText}>RUNNER</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Participants */}
                {participants.length > 0 && (
                    <Animated.View entering={FadeInUp.duration(300).delay(160)} style={{ marginTop: 28 }}>
                        <Text style={styles.sectionLabel}>{`PARTICIPANTS · ${participants.length}`}</Text>

                        <View style={{ gap: 10, marginTop: 10 }}>
                            {participants.map((participant, idx) => {
                                const name = `${participant.firstName} ${participant.lastName}`.trim();
                                const isExpanded = expandedId === participant.orderUserId;
                                const chipConfig =
                                    SETTLEMENT_CONFIG[participant.settlementStatus] ??
                                    SETTLEMENT_CONFIG.unpaid;
                                const isSettled =
                                    participant.settlementStatus === "confirmed" ||
                                    participant.settlementStatus === "settled_in_person";

                                return (
                                    <Animated.View
                                        key={participant.orderUserId}
                                        entering={FadeInUp.duration(300).delay(180 + idx * 40)}
                                    >
                                        <Pressable
                                            onPress={() => toggleExpanded(participant.orderUserId)}
                                            style={styles.participantCard}
                                        >
                                            <View style={styles.participantRow}>
                                                <BrAvatar
                                                    name={name || "U"}
                                                    avatarUrl={participant.avatarUrl ?? null}
                                                    size={44}
                                                />
                                                <View style={{ flex: 1, minWidth: 0 }}>
                                                    <Text style={styles.participantName}>{name || "Unknown"}</Text>
                                                    <Text style={styles.participantMeta}>
                                                        {participant.itemCount}{" "}
                                                        {participant.itemCount === 1 ? "line" : "lines"}
                                                        {participant.amountOwed > 0
                                                            ? ` · $${(participant.amountOwed / 100).toFixed(2)}`
                                                            : ""}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                    <View style={[styles.settlementChip, { backgroundColor: chipConfig.bg }]}>
                                                        <View style={[styles.settlementDot, { backgroundColor: chipConfig.dot }]} />
                                                        <Text style={[styles.settlementChipText, { color: chipConfig.fg }]}>
                                                            {chipConfig.label}
                                                        </Text>
                                                    </View>
                                                    <Icon
                                                        name={isExpanded ? "ChevronUp" : "ChevronDown"}
                                                        size={16}
                                                        color={BR.ink3}
                                                    />
                                                </View>
                                            </View>

                                            {isExpanded && participant.items.length > 0 && (
                                                <View style={styles.itemsSection}>
                                                    {participant.items.map((item, iIdx) => (
                                                        <View key={iIdx} style={styles.itemRow}>
                                                            <Text style={styles.itemIndex}>
                                                                {String(iIdx + 1).padStart(2, "0")}
                                                            </Text>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.itemText}>{item.text}</Text>
                                                                {item.locationName && (
                                                                    <Text style={styles.itemLocation}>
                                                                        {item.locationName.toUpperCase()}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                            {item.priceInCents !== null && (
                                                                <Text style={styles.itemPrice}>
                                                                    ${(item.priceInCents / 100).toFixed(2)}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    ))}

                                                    {participant.amountOwed > 0 && (
                                                        <>
                                                            <View style={styles.itemsDivider} />
                                                            <View style={styles.amountRow}>
                                                                <Text style={styles.amountLabel}>
                                                                    {isSettled ? "AMOUNT PAID" : "AMOUNT OWED"}
                                                                </Text>
                                                                <Text style={[
                                                                    styles.amountValue,
                                                                    { color: isSettled ? BR.mint : BR.coral },
                                                                ]}>
                                                                    ${(participant.amountOwed / 100).toFixed(2)}
                                                                </Text>
                                                            </View>
                                                        </>
                                                    )}
                                                </View>
                                            )}
                                        </Pressable>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        borderWidth: 1,
        borderColor: BR.line,
        alignItems: "center",
        justifyContent: "center",
    },
    completedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: BR.mintSoft,
    },
    completedBadgeText: {
        fontSize: 13,
        fontWeight: "700",
        color: BR.mintInk,
    },
    pageTitle: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 46,
        color: BR.ink,
        marginTop: 14,
        lineHeight: 50,
    },
    pageDate: {
        fontSize: 13,
        color: BR.ink3,
        marginTop: 6,
        fontFamily: BR_FONT.mono,
        letterSpacing: 0.3,
    },
    receipt: {
        backgroundColor: BR.card,
        paddingHorizontal: 22,
        paddingVertical: 22,
    },
    receiptTitle: {
        fontFamily: BR_FONT.displayExtraBold,
        fontStyle: "italic",
        fontSize: 22,
        color: BR.orangeDeep,
        textAlign: "center",
    },
    receiptSubtitle: {
        fontFamily: BR_FONT.mono,
        fontSize: 10,
        color: BR.ink3,
        textAlign: "center",
        letterSpacing: 1.4,
        marginTop: 4,
    },
    statCell: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: BR.line2,
        marginVertical: 4,
    },
    statNumber: {
        fontSize: 30,
        fontWeight: "800",
        color: BR.ink,
        lineHeight: 36,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 1.4,
        marginTop: 4,
    },
    receiptCode: {
        fontSize: 12,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 2.5,
        textAlign: "center",
    },
    receiptDots: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginTop: 10,
    },
    receiptDot: {
        width: 5,
        height: 5,
        borderRadius: 999,
        backgroundColor: BR.line2,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 1.4,
        marginBottom: 10,
    },
    participantCard: {
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: "rgba(255,106,31,0.18)",
        backgroundColor: BR.orangeTint,
        overflow: "hidden",
    },
    runnerCard: {
        backgroundColor: BR.orangeTint,
        borderColor: "rgba(255,106,31,0.18)",
    },
    participantRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
    },
    participantName: {
        fontSize: 15,
        fontWeight: "700",
        color: BR.ink,
    },
    participantMeta: {
        fontSize: 12,
        color: BR.ink3,
        marginTop: 2,
        fontFamily: BR_FONT.mono,
    },
    runnerPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: BR.yolkSoft,
        borderWidth: 1,
        borderColor: "rgba(255,197,66,0.5)",
    },
    runnerPillCircle: {
        width: 7,
        height: 7,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: "#7A4A20",
    },
    runnerPillText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#7A4A20",
        letterSpacing: 0.8,
    },
    settlementChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    settlementDot: {
        width: 6,
        height: 6,
        borderRadius: 999,
    },
    settlementChipText: {
        fontSize: 12,
        fontWeight: "700",
    },
    itemsSection: {
        borderTopWidth: 1,
        borderTopColor: BR.line,
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 10,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    itemIndex: {
        fontSize: 13,
        fontFamily: BR_FONT.monoBold,
        color: BR.ink3,
        width: 22,
        lineHeight: 20,
    },
    itemText: {
        fontSize: 14,
        fontWeight: "700",
        color: BR.ink,
        lineHeight: 20,
    },
    itemLocation: {
        fontSize: 10,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 0.8,
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 14,
        color: BR.ink,
        fontFamily: BR_FONT.mono,
        lineHeight: 20,
    },
    itemsDivider: {
        borderBottomWidth: 1,
        borderStyle: "dashed",
        borderColor: BR.line2,
        marginVertical: 4,
    },
    amountRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    amountLabel: {
        fontSize: 11,
        fontFamily: BR_FONT.monoBold,
        color: BR.ink2,
        letterSpacing: 1,
    },
    amountValue: {
        fontSize: 22,
        fontWeight: "800",
        fontFamily: BR_FONT.displayExtraBold,
    },
});
