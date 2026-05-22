import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrText, BrChip, BrAvatar } from "@/components/br";
import { BR, BR_FONT_STYLE, BR_SHADOW } from "@/lib/br-theme";

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
  if (
    m.settlementStatus === "confirmed" ||
    m.settlementStatus === "settled_in_person"
  )
    return "paid";
  if (m.stripePayment?.status === "pending") return "sent";
  return "outstanding";
}

// ── TornEdge ─────────────────────────────────────────────────────

const TOOTH_W = 9;
const TOOTH_H = 7;

function TornEdge({ position }: { position: "top" | "bottom" }) {
  const { width } = useWindowDimensions();
  const count = Math.ceil(width / TOOTH_W) + 2;
  const teeth = Array.from(
    { length: count },
    (_, index) => `${position}-tooth-${index}`,
  );
  return (
    <View
      className="flex-row overflow-hidden bg-[#FFF7EE]"
      style={{ height: TOOTH_H }}
    >
      {teeth.map((toothKey) => (
        <View
          key={toothKey}
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
  const chipDotClass = isPaid
    ? "bg-[#2EBE7B]"
    : isSent
      ? "bg-[#FF6A1F]"
      : "bg-[#FF4D6D]";

  return (
    <Animated.View
      entering={FadeInUp.duration(280).delay(idx * 55 + 100)}
      className={`flex-row items-center gap-3 rounded-[22px] border p-3.5 ${
        isSent
          ? "border-[rgba(255,106,31,0.25)] bg-[#FFF1E2]"
          : "border-[rgba(26,20,16,0.08)] bg-white"
      } ${isPaid ? "opacity-[0.88]" : ""}`}
      style={BR_SHADOW.card}
    >
      <BrAvatar
        name={`${m.firstName} ${m.lastName}`}
        avatarUrl={m.avatarUrl}
        size={44}
      />

      <View className="min-w-0 flex-1 gap-1">
        <Text
          className="text-[14px] text-[#1A1410]"
          style={BR_FONT_STYLE.display}
          numberOfLines={1}
        >
          {m.firstName} {m.lastName}
        </Text>
        <BrChip
          color={chipColor}
          leftSlot={
            <View className={`h-[5px] w-[5px] rounded-full ${chipDotClass}`} />
          }
        >
          {chipLabel}
        </BrChip>
      </View>

      <View className="items-end gap-1.5">
        <Text
          className={`text-[17px] ${isPaid ? "text-[#1B6B43] line-through opacity-[0.55]" : "text-[#1A1410]"}`}
          style={BR_FONT_STYLE.displayExtraBold}
        >
          {formatCents(Number(m.amountOwed))}
        </Text>
        {isOut && (
          <View className="flex-row gap-1.5">
            <Pressable
              onPress={onMarkCash}
              className="h-7 items-center justify-center rounded-full bg-[#DDF5E8] px-2.5"
            >
              <Text
                className="text-[11px] tracking-[0.5px] text-[#1B6B43]"
                style={BR_FONT_STYLE.monoBold}
              >
                CASH
              </Text>
            </Pressable>
          </View>
        )}
        {isSent && (
          <Pressable
            onPress={onMarkCash}
            className="h-7 items-center justify-center rounded-full border border-[rgba(26,20,16,0.14)] bg-[#FCEFE0] px-2.5"
          >
            <Text
              className="text-[11px] tracking-[0.5px] text-[#4A3C32]"
              style={BR_FONT_STYLE.monoBold}
            >
              CONFIRM
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export default function Settlement() {
  const params = useLocalSearchParams();
  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
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
      await updateOrder({
        orderId: orderId as Id<"orders">,
        status: "completed",
      });
      Alert.alert("Order Complete", "This order has been marked as complete.", [
        { text: "OK", onPress: () => router.dismissTo("/(protected)/(tabs)") },
      ]);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to complete order",
      );
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
                error instanceof Error
                  ? error.message
                  : "Failed to mark as settled",
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
      const result = await nudgeUnsettledMembers({
        orderId: orderId as Id<"orders">,
      });
      const count = result.nudgedCount;
      Alert.alert(
        count > 0 ? "Nudges sent" : "No nudges sent",
        count > 0
          ? `Sent ${count} payment reminder${count === 1 ? "" : "s"}.`
          : "Everyone with a balance has already settled.",
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to send nudges",
      );
    } finally {
      setIsNudging(false);
    }
  };

  if (paymentStatus === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF7EE]">
        <ActivityIndicator size="large" color={BR.orange} />
      </View>
    );
  }

  if (paymentStatus === null) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF7EE]">
        <Text className="text-[#B82340]" style={BR_FONT_STYLE.mono}>
          Not authorized to view settlement
        </Text>
      </View>
    );
  }

  const members = paymentStatus.members as Member[];
  const nonCreatorMembers = members.filter((m) => !m.isCreator);
  const totalOwed = nonCreatorMembers.reduce(
    (s, m) => s + Number(m.amountOwed),
    0,
  );
  const totalPaid = nonCreatorMembers
    .filter(
      (m) =>
        m.settlementStatus === "confirmed" ||
        m.settlementStatus === "settled_in_person",
    )
    .reduce((s, m) => s + Number(m.amountOwed), 0);
  const outstanding = Math.max(0, totalOwed - totalPaid);
  const allSettled = nonCreatorMembers
    .filter((m) => Number(m.amountOwed) > 0)
    .every(
      (m) =>
        m.settlementStatus === "confirmed" ||
        m.settlementStatus === "settled_in_person",
    );
  const paidCount = nonCreatorMembers.filter(
    (m) => getMemberVisualStatus(m) === "paid",
  ).length;
  const pct = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
  const outstandingCount = nonCreatorMembers.filter(
    (m) => Number(m.amountOwed) > 0 && getMemberVisualStatus(m) !== "paid",
  ).length;

  return (
    <>
      <SafeAreaView edges={["top"]} className="bg-[#FFF7EE]" />

      {/* Header */}
      <View className="flex-row items-center justify-between bg-[#FFF7EE] px-[18px] pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText
          weight="bold"
          className="text-[17px] leading-6"
          style={BR_FONT_STYLE.display}
        >
          Settle up
        </BrText>
        <View className="w-[38px]" />
      </View>

      <ScrollView
        className="flex-1 bg-[#FFF7EE]"
        contentContainerClassName="px-[18px] pb-[140px]"
        showsVerticalScrollIndicator={false}
      >
        <BrText variant="eyebrow" className="mb-2.5">
          {paymentStatus.orderName}
        </BrText>

        {/* Receipt card */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <TornEdge position="top" />
          <View className="bg-white px-[22px] py-6">
            <View className="items-center">
              <Text
                className="text-center text-[20px] italic text-[#E8551A]"
                style={BR_FONT_STYLE.displayExtraBold}
              >
                You are the runner
              </Text>
              <Text
                className="mt-[3px] text-center text-[11px] tracking-[1.2px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
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

            <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />

            <View className="mb-[5px] flex-row justify-between">
              <Text
                className="text-[13px] text-[#4A3C32]"
                style={BR_FONT_STYLE.mono}
              >
                Members
              </Text>
              <Text
                className="text-[13px] text-[#1A1410]"
                style={BR_FONT_STYLE.mono}
              >
                {nonCreatorMembers.length}
              </Text>
            </View>
            <View className="mb-[5px] flex-row justify-between">
              <Text
                className="text-[13px] text-[#4A3C32]"
                style={BR_FONT_STYLE.mono}
              >
                Total owed
              </Text>
              <Text
                className="text-[13px] text-[#1A1410]"
                style={BR_FONT_STYLE.mono}
              >
                {formatCents(totalOwed)}
              </Text>
            </View>
            <View className="mb-[5px] flex-row justify-between">
              <Text
                className="text-[13px] text-[#4A3C32]"
                style={BR_FONT_STYLE.mono}
              >
                Collected
              </Text>
              <Text
                className="text-[13px] text-[#1B6B43]"
                style={BR_FONT_STYLE.mono}
              >
                + {formatCents(totalPaid)}
              </Text>
            </View>

            <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />

            <View className="flex-row items-baseline justify-between">
              <Text
                className="text-lg text-[#1A1410]"
                style={BR_FONT_STYLE.displayExtraBold}
              >
                OUTSTANDING
              </Text>
              <Text
                className={`text-[32px] ${allSettled ? "text-[#1B6B43]" : "text-[#FF4D6D]"}`}
                style={BR_FONT_STYLE.displayExtraBold}
              >
                {formatCents(outstanding)}
              </Text>
            </View>

            <View className="mt-3.5">
              <View className="h-1.5 overflow-hidden rounded-full bg-[#FCEFE0]">
                <View
                  className={`h-full rounded-full ${allSettled ? "bg-[#2EBE7B]" : "bg-[#FF6A1F]"}`}
                  style={{ width: `${pct}%` }}
                />
              </View>
              <View className="mt-1.5 flex-row justify-between">
                <Text
                  className="text-[11px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  {paidCount} of {nonCreatorMembers.length} paid
                </Text>
                <Text
                  className="text-[11px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  {pct}%
                </Text>
              </View>
            </View>

            <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />
            <View className="items-center">
              <Text
                className="text-[10px] tracking-[1px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                BR-RUN-{orderId?.slice(-4).toUpperCase() ?? "----"}
              </Text>
              <Text
                className="mt-[5px] text-[10px] tracking-[5px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                · · · · · · · ·
              </Text>
            </View>
          </View>
          <TornEdge position="bottom" />
        </Animated.View>

        {/* Ledger */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(80)}
          className="mt-[22px]"
        >
          <View className="mb-2.5 flex-row items-center justify-between">
            <BrText variant="eyebrow">
              Ledger · {nonCreatorMembers.length}
            </BrText>
            <Pressable
              onPress={handleNudgeAll}
              disabled={isNudging || outstandingCount === 0}
              hitSlop={8}
              className={`flex-row items-center gap-[5px] ${isNudging || outstandingCount === 0 ? "opacity-[0.45]" : ""}`}
            >
              {isNudging ? (
                <ActivityIndicator size="small" color={BR.orangeDeep} />
              ) : (
                <Icon name="Bell" size={11} color={BR.orangeDeep} />
              )}
              <Text
                className="text-[11px] tracking-[0.5px] text-[#E8551A]"
                style={BR_FONT_STYLE.monoBold}
              >
                {isNudging ? "NUDGING" : "NUDGE ALL"}
              </Text>
            </Pressable>
          </View>

          <View className="gap-2.5">
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
            <View className="mt-5 items-center">
              <View
                className="rounded-full bg-[#FFF1C4] px-3.5 py-[7px]"
                style={{ transform: [{ rotate: "-2deg" }] }}
              >
                <Text
                  className="text-[11px] text-[#7A4A20]"
                  style={BR_FONT_STYLE.mono}
                >
                  ☕ Runs settle 2× faster with a nudge
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View
        className="gap-2.5 border-t border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-[18px] pt-3.5"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {!allSettled && (
          <View className="flex-row items-center gap-2 rounded-2xl border border-[rgba(255,77,109,0.2)] bg-[#FFE0E6] p-3">
            <Icon name="CircleAlert" size={14} color={BR.coralInk} />
            <Text
              className="flex-1 text-xs text-[#B82340]"
              style={BR_FONT_STYLE.monoSemibold}
              numberOfLines={1}
            >
              {formatCents(outstanding)} outstanding from {outstandingCount}
            </Text>
            <Pressable
              onPress={handleCompleteOrder}
              className="rounded-lg bg-[rgba(255,77,109,0.18)] px-2.5 py-1.5"
            >
              <Text
                className="text-[11px] tracking-[0.5px] text-[#B82340]"
                style={BR_FONT_STYLE.monoBold}
              >
                CLOSE ANYWAY
              </Text>
            </Pressable>
          </View>
        )}
        <TouchableOpacity
          onPress={handleCompleteOrder}
          disabled={isCompleting}
          className={`h-[54px] flex-row items-center justify-center gap-2 rounded-2xl ${allSettled ? "bg-[#2EBE7B]" : "bg-[#FF6A1F]"} ${isCompleting ? "opacity-60" : ""}`}
          style={
            allSettled
              ? { ...BR_SHADOW.primary, shadowColor: BR.mint }
              : BR_SHADOW.primary
          }
        >
          {isCompleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name={allSettled ? "Check" : "Flag"} size={16} color="#fff" />
          )}
          <Text className="text-base text-white" style={BR_FONT_STYLE.display}>
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
