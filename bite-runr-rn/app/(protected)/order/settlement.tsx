import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrText, BrChip, BrAvatar } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";

type Member = {
    orderUserId: string;
    userId: string;
    isCreator: boolean;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    amountOwed: bigint | number;
    settlementStatus: string;
    stripePayment: { status: string; amount: number } | null;
};

function formatCents(cents: number | bigint): string {
    const num = typeof cents === "bigint" ? Number(cents) : cents;
    return `$${(num / 100).toFixed(2)}`;
}

function getMemberVisualStatus(m: Member): "paid" | "sent" | "outstanding" {
    if (m.settlementStatus === "confirmed" || m.settlementStatus === "settled_in_person") return "paid";
    if (m.stripePayment?.status === "pending") return "sent";
    return "outstanding";
}

// ── TornEdge ─────────────────────────────────────────────────────

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

// ── MemberRow ────────────────────────────────────────────────────

function MemberRow({
    m,
    idx,
    onMarkCash,
}: {
    m: Member;
    idx: number;
    onMarkCash: () => void;
}) {
    const status = getMemberVisualStatus(m);
    const isPaid = status === "paid";
    const isSent = status === "sent";
    const isOut = status === "outstanding";

    const chipColor = isPaid ? "mint" : isSent ? "orange" : "coral";
    const chipLabel = isPaid
        ? m.settlementStatus === "settled_in_person"
            ? "Cash · paid"
            : "Paid"
        : isSent
          ? "Sent"
          : "Awaiting";
    const chipDotColor = isPaid ? BR.mint : isSent ? BR.orange : BR.coral;

    return (
        <Animated.View
            entering={FadeInUp.duration(280).delay(idx * 55 + 100)}
            style={[
                styles.memberCard,
                {
                    backgroundColor: isSent ? BR.orangeTint : BR.card,
                    borderColor: isSent ? "rgba(255,106,31,0.25)" : BR.line,
                    opacity: isPaid ? 0.88 : 1,
                },
            ]}
        >
            <BrAvatar name={`${m.firstName} ${m.lastName}`} avatarUrl={m.avatarUrl} size={44} />

            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                    {m.firstName} {m.lastName}
                </Text>
                <BrChip
                    color={chipColor}
                    leftSlot={
                        <View
                            style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: chipDotColor }}
                        />
                    }
                >
                    {chipLabel}
                </BrChip>
            </View>

            <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text
                    style={[
                        styles.memberAmount,
                        { color: isPaid ? BR.mintInk : BR.ink },
                        isPaid && { textDecorationLine: "line-through", opacity: 0.55 },
                    ]}
                >
                    {formatCents(Number(m.amountOwed))}
                </Text>
                {isOut && (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                        <Pressable onPress={onMarkCash} style={styles.cashBtn}>
                            <Text style={styles.cashBtnText}>CASH</Text>
                        </Pressable>
                    </View>
                )}
                {isSent && (
                    <Pressable onPress={onMarkCash} style={styles.confirmPill}>
                        <Text style={styles.confirmPillText}>CONFIRM</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

// ── Main ─────────────────────────────────────────────────────────

export default function Settlement() {
    const params = useLocalSearchParams();
    const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
    const insets = useSafeAreaInsets();
    const [isCompleting, setIsCompleting] = useState(false);
    const [isNudging, setIsNudging] = useState(false);

    const paymentStatus = useQuery(
        api.payments.getOrderPaymentStatus,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );
    const markSettledInPerson = useMutation(api.payments.markSettledInPerson);
    const nudgeUnsettledMembers = useMutation(api.payments.nudgeUnsettledMembers);
    const updateOrder = useMutation(api.orders.update);

    const handleCompleteOrder = async () => {
        if (!orderId) return;
        setIsCompleting(true);
        try {
            await updateOrder({ orderId: orderId as Id<"orders">, status: "completed" });
            Alert.alert("Order Complete", "This order has been marked as complete.", [
                { text: "OK", onPress: () => router.dismissTo("/(protected)/(tabs)") },
            ]);
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to complete order");
        } finally {
            setIsCompleting(false);
        }
    };

    const handleMarkSettled = (member: Member) => {
        Alert.alert(
            "Mark as Settled",
            `Confirm that ${member.firstName} ${member.lastName} has paid ${formatCents(member.amountOwed)} in person?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            await markSettledInPerson({
                                orderId: orderId as Id<"orders">,
                                orderUserId: member.orderUserId as Id<"orderUsers">,
                            });
                        } catch (error) {
                            Alert.alert(
                                "Error",
                                error instanceof Error ? error.message : "Failed to mark as settled",
                            );
                        }
                    },
                },
            ],
        );
    };

    const handleNudgeAll = async () => {
        if (!orderId || isNudging) return;
        setIsNudging(true);
        try {
            const result = await nudgeUnsettledMembers({ orderId: orderId as Id<"orders"> });
            const count = result.nudgedCount;
            Alert.alert(
                count > 0 ? "Nudges sent" : "No nudges sent",
                count > 0
                    ? `Sent ${count} payment reminder${count === 1 ? "" : "s"}.`
                    : "Everyone with a balance has already settled.",
            );
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to send nudges");
        } finally {
            setIsNudging(false);
        }
    };

    if (paymentStatus === undefined) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BR.paper }}>
                <ActivityIndicator size="large" color={BR.orange} />
            </View>
        );
    }

    if (paymentStatus === null) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BR.paper }}>
                <Text style={{ fontFamily: BR_FONT.mono, color: BR.coralInk }}>
                    Not authorized to view settlement
                </Text>
            </View>
        );
    }

    const members = paymentStatus.members as Member[];
    const nonCreatorMembers = members.filter((m) => !m.isCreator);
    const totalOwed = nonCreatorMembers.reduce((s, m) => s + Number(m.amountOwed), 0);
    const totalPaid = nonCreatorMembers
        .filter((m) => m.settlementStatus === "confirmed" || m.settlementStatus === "settled_in_person")
        .reduce((s, m) => s + Number(m.amountOwed), 0);
    const outstanding = Math.max(0, totalOwed - totalPaid);
    const allSettled = nonCreatorMembers
        .filter((m) => Number(m.amountOwed) > 0)
        .every((m) => m.settlementStatus === "confirmed" || m.settlementStatus === "settled_in_person");
    const paidCount = nonCreatorMembers.filter((m) => getMemberVisualStatus(m) === "paid").length;
    const pct = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
    const outstandingCount = nonCreatorMembers.filter(
        (m) => Number(m.amountOwed) > 0 && getMemberVisualStatus(m) !== "paid",
    ).length;

    return (
        <>
            <SafeAreaView edges={["top"]} style={{ backgroundColor: BR.paper }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Icon name="ChevronLeft" size={20} color={BR.ink} />
                </Pressable>
                <View pointerEvents="none" style={styles.headerTitle}>
                    <BrText weight="bold" style={{ fontSize: 17, lineHeight: 24 }}>
                        Settle up
                    </BrText>
                </View>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                style={{ flex: 1, backgroundColor: BR.paper }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
            >
                <BrText variant="eyebrow" style={{ marginBottom: 10 }}>
                    {paymentStatus.orderName}
                </BrText>

                {/* Receipt card */}
                <Animated.View entering={FadeInUp.duration(300)}>
                    <TornEdge position="top" />
                    <View style={styles.receipt}>
                        <View style={{ alignItems: "center" }}>
                            <Text style={styles.receiptTitle}>You are the runner</Text>
                            <Text style={styles.receiptMeta}>
                                ·{" "}
                                {new Date()
                                    .toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                    })
                                    .toUpperCase()}{" "}
                                ·
                            </Text>
                        </View>

                        <View style={styles.rule} />

                        <View style={styles.receiptRow}>
                            <Text style={styles.rowLabel}>Members</Text>
                            <Text style={styles.rowValue}>{nonCreatorMembers.length}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.rowLabel}>Total owed</Text>
                            <Text style={styles.rowValue}>{formatCents(totalOwed)}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.rowLabel}>Collected</Text>
                            <Text style={[styles.rowValue, { color: BR.mintInk }]}>
                                + {formatCents(totalPaid)}
                            </Text>
                        </View>

                        <View style={styles.rule} />

                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                            }}
                        >
                            <Text style={styles.outstandingLabel}>OUTSTANDING</Text>
                            <Text
                                style={[
                                    styles.outstandingAmount,
                                    { color: allSettled ? BR.mintInk : BR.coral },
                                ]}
                            >
                                {formatCents(outstanding)}
                            </Text>
                        </View>

                        <View style={{ marginTop: 14 }}>
                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${pct}%` as any,
                                            backgroundColor: allSettled ? BR.mint : BR.orange,
                                        },
                                    ]}
                                />
                            </View>
                            <View
                                style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}
                            >
                                <Text style={styles.progressMeta}>
                                    {paidCount} of {nonCreatorMembers.length} paid
                                </Text>
                                <Text style={styles.progressMeta}>{pct}%</Text>
                            </View>
                        </View>

                        <View style={styles.rule} />
                        <View style={{ alignItems: "center" }}>
                            <Text style={styles.receiptCode}>
                                BR-RUN-{orderId?.slice(-4).toUpperCase() ?? "----"}
                            </Text>
                            <Text style={[styles.receiptCode, { marginTop: 5, letterSpacing: 5 }]}>
                                · · · · · · · ·
                            </Text>
                        </View>
                    </View>
                    <TornEdge position="bottom" />
                </Animated.View>

                {/* Ledger */}
                <Animated.View entering={FadeInUp.duration(300).delay(80)} style={{ marginTop: 22 }}>
                    <View style={styles.ledgerHeader}>
                        <BrText variant="eyebrow">Ledger · {nonCreatorMembers.length}</BrText>
                        <Pressable
                            onPress={handleNudgeAll}
                            disabled={isNudging || outstandingCount === 0}
                            hitSlop={8}
                            style={[
                                { flexDirection: "row", alignItems: "center", gap: 5 },
                                (isNudging || outstandingCount === 0) && { opacity: 0.45 },
                            ]}
                        >
                            {isNudging ? (
                                <ActivityIndicator size="small" color={BR.orangeDeep} />
                            ) : (
                                <Icon name="Bell" size={11} color={BR.orangeDeep} />
                            )}
                            <Text style={styles.nudgeAllText}>
                                {isNudging ? "NUDGING" : "NUDGE ALL"}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={{ gap: 10 }}>
                        {nonCreatorMembers.map((m, i) => (
                            <MemberRow
                                key={m.orderUserId}
                                m={m}
                                idx={i}
                                onMarkCash={() => handleMarkSettled(m)}
                            />
                        ))}
                    </View>

                    {!allSettled && (
                        <View style={{ alignItems: "center", marginTop: 20 }}>
                            <View style={styles.sticker}>
                                <Text style={styles.stickerText}>
                                    ☕ Runs settle 2× faster with a nudge
                                </Text>
                            </View>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {!allSettled && (
                    <View style={styles.warningBanner}>
                        <Icon name="CircleAlert" size={14} color={BR.coralInk} />
                        <Text style={styles.warningText} numberOfLines={1}>
                            {formatCents(outstanding)} outstanding from {outstandingCount}
                        </Text>
                        <Pressable onPress={handleCompleteOrder} style={styles.closeAnywayBtn}>
                            <Text style={styles.closeAnywayText}>CLOSE ANYWAY</Text>
                        </Pressable>
                    </View>
                )}
                <TouchableOpacity
                    onPress={handleCompleteOrder}
                    disabled={isCompleting}
                    style={[
                        styles.completeBtn,
                        allSettled && { backgroundColor: BR.mint, shadowColor: BR.mint },
                        isCompleting && { opacity: 0.6 },
                    ]}
                >
                    {isCompleting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Icon name={allSettled ? "Check" : "Flag"} size={16} color="#fff" />
                    )}
                    <Text style={styles.completeBtnText}>
                        {isCompleting
                            ? "Completing…"
                            : allSettled
                              ? "Complete run · all settled"
                              : "Complete run"}
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: BR.paper,
        position: "relative",
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
    headerTitle: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 8,
        bottom: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    receipt: {
        backgroundColor: BR.card,
        paddingHorizontal: 22,
        paddingVertical: 24,
    },
    receiptTitle: {
        fontFamily: BR_FONT.displayExtraBold,
        fontStyle: "italic",
        fontSize: 20,
        color: BR.orangeDeep,
        textAlign: "center",
    },
    receiptMeta: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: BR.ink3,
        letterSpacing: 1.2,
        marginTop: 3,
    },
    rule: {
        height: 1,
        backgroundColor: "rgba(26,20,16,0.1)",
        marginVertical: 14,
    },
    receiptRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    rowLabel: {
        fontFamily: BR_FONT.mono,
        fontSize: 13,
        color: BR.ink2,
    },
    rowValue: {
        fontFamily: BR_FONT.mono,
        fontSize: 13,
        color: BR.ink,
    },
    outstandingLabel: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 18,
        color: BR.ink,
    },
    outstandingAmount: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 32,
    },
    progressTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
    },
    progressMeta: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: BR.ink3,
    },
    receiptCode: {
        fontFamily: BR_FONT.mono,
        fontSize: 10,
        color: BR.ink3,
        letterSpacing: 1,
    },
    ledgerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    nudgeAllText: {
        fontFamily: BR_FONT.monoBold,
        fontSize: 11,
        color: BR.orangeDeep,
        letterSpacing: 0.5,
    },
    memberCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        ...BR_SHADOW.card,
    },
    memberName: {
        fontFamily: BR_FONT.display,
        fontSize: 14,
        fontWeight: "700",
        color: BR.ink,
    },
    memberAmount: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 17,
    },
    cashBtn: {
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: BR.mintSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    cashBtnText: {
        fontFamily: BR_FONT.monoBold,
        fontSize: 11,
        color: BR.mintInk,
        letterSpacing: 0.5,
    },
    confirmPill: {
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BR.line2,
        backgroundColor: BR.paper2,
        alignItems: "center",
        justifyContent: "center",
    },
    confirmPillText: {
        fontFamily: BR_FONT.monoBold,
        fontSize: 11,
        color: BR.ink2,
        letterSpacing: 0.5,
    },
    sticker: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: BR.yolkSoft,
        transform: [{ rotate: "-2deg" }],
    },
    stickerText: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: "#7A4A20",
    },
    footer: {
        paddingHorizontal: 18,
        paddingTop: 14,
        gap: 10,
        backgroundColor: BR.paper,
        borderTopWidth: 1,
        borderTopColor: BR.line,
    },
    warningBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: BR_RADIUS.md,
        backgroundColor: BR.coralSoft,
        borderWidth: 1,
        borderColor: "rgba(255,77,109,0.2)",
    },
    warningText: {
        flex: 1,
        fontFamily: BR_FONT.mono,
        fontSize: 12,
        color: BR.coralInk,
        fontWeight: "600",
    },
    closeAnywayBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "rgba(255,77,109,0.18)",
    },
    closeAnywayText: {
        fontFamily: BR_FONT.monoBold,
        fontSize: 11,
        color: BR.coralInk,
        letterSpacing: 0.5,
    },
    completeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 54,
        borderRadius: BR_RADIUS.md,
        backgroundColor: BR.orange,
        ...BR_SHADOW.primary,
    },
    completeBtnText: {
        fontFamily: BR_FONT.display,
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
});
