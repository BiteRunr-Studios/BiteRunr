import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import Animated, { FadeInUp } from "react-native-reanimated";
import { BrAvatar, BrText } from "@/components/br";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { useCallback, useMemo, useState } from "react";

const TOOTH_W = 9;
const TOOTH_H = 7;

function TornEdge({ position }: { position: "top" | "bottom" }) {
  const { width } = useWindowDimensions();
  const count = Math.ceil(width / TOOTH_W) + 2;
  const teeth = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => `${position}-tooth-${index}`),
    [count, position],
  );
  return (
    <View className="h-[7px] flex-row overflow-hidden bg-[#FFF7EE]">
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

const SETTLEMENT_CONFIG: Record<
  string,
  { label: string; bg: string; fg: string; dot: string }
> = {
  confirmed: {
    label: "Settled",
    bg: BR.mintSoft,
    fg: BR.mintInk,
    dot: BR.mint,
  },
  settled_in_person: {
    label: "Settled",
    bg: BR.mintSoft,
    fg: BR.mintInk,
    dot: BR.mint,
  },
  claimed: { label: "Pending", bg: BR.yolkSoft, fg: "#7A4A20", dot: BR.yolk },
  unpaid: { label: "Unpaid", bg: BR.coralSoft, fg: BR.coralInk, dot: BR.coral },
};

function Rule() {
  return <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />;
}

export default function CompletedOrder() {
  const { orderId } = useLocalSearchParams();
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
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        <View className="flex-row items-center justify-between px-[18px] pb-1 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
          <View className="flex-row items-center gap-1.5 rounded-full bg-[#DDF5E8] px-3.5 py-2">
            <Icon name="Check" size={12} color={BR.mintInk} strokeWidth={3} />
            <Text
              className="text-[13px] text-[#1B6B43]"
              style={BR_FONT_STYLE.display}
            >
              Completed
            </Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <BrText className="text-[#8A7A6E]">
            This order is no longer available.
          </BrText>
        </View>
      </SafeAreaView>
    );
  }

  if (data === undefined) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        <View className="flex-row items-center justify-between px-[18px] pb-1 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
        </View>
        <Skeleton>
          <View className="mt-2 gap-4 px-[18px]">
            <SkeletonBlock width={200} height={48} rounded="rounded-xl" />
            <SkeletonBlock width={160} height={14} rounded="rounded-md" />
            <SkeletonBlock width="100%" height={210} rounded="rounded-3xl" />
            <SkeletonBlock width={60} height={12} rounded="rounded-md" />
            <SkeletonBlock width="100%" height={72} rounded="rounded-2xl" />
            <SkeletonBlock width={120} height={12} rounded="rounded-md" />
            {[1, 2].map((i) => (
              <SkeletonBlock
                key={i}
                width="100%"
                height={80}
                rounded="rounded-2xl"
              />
            ))}
          </View>
        </Skeleton>
      </SafeAreaView>
    );
  }

  const d = new Date(data.order.createdAt);
  const weekday = d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const monthStr = d
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const day = d.getDate();
  const year = d.getFullYear();
  const dateLabel = `${weekday} · ${monthStr} ${day}, ${year}`;

  const nameCode = (data.order.name || "RUN")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 4);
  const receiptCode = `BR-${nameCode}-${d.getMonth() + 1}M${String(day).padStart(2, "0")}`;

  const runner = data.participants.find((p) => p.isCreator);
  const participants = data.participants.filter((p) => !p.isCreator);
  const allSettled = participants.every(
    (p) =>
      p.settlementStatus === "confirmed" ||
      p.settlementStatus === "settled_in_person",
  );
  const locationName = data.locations[0]?.name ?? data.order.name;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-[18px] pb-1 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <View className="flex-row items-center gap-1.5 rounded-full bg-[#DDF5E8] px-3.5 py-2">
          <Icon name="Check" size={12} color={BR.mintInk} strokeWidth={3} />
          <Text
            className="text-[13px] text-[#1B6B43]"
            style={BR_FONT_STYLE.display}
          >
            Completed
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[18px] pb-[60px]"
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <Text
            className="mt-3.5 text-[46px] leading-[50px] text-[#1A1410]"
            style={BR_FONT_STYLE.displayExtraBold}
          >
            {data.order.name}
          </Text>
          <Text
            className="mt-1.5 text-[13px] tracking-[0.3px] text-[#8A7A6E]"
            style={BR_FONT_STYLE.mono}
          >
            {dateLabel}
          </Text>
        </Animated.View>

        {/* Receipt card */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(60)}
          className="mt-[22px]"
        >
          <TornEdge position="top" />
          <View className="bg-white px-[22px] py-[22px]">
            <View className="items-center">
              <Text
                className="text-center text-[22px] italic text-[#E8551A]"
                style={BR_FONT_STYLE.displayExtraBold}
              >
                {locationName}
              </Text>
              <Text
                className="mt-1 text-center text-[10px] tracking-[1.4px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                {`· RUN COMPLETE · ${allSettled ? "ALL SETTLED" : "SETTLEMENT PENDING"} ·`}
              </Text>
            </View>

            <Rule />

            {/* Stats row */}
            <View className="flex-row">
              <View className="flex-1 items-center py-1">
                <Text
                  className="text-[30px] leading-9 text-[#1A1410]"
                  style={BR_FONT_STYLE.displayExtraBold}
                >
                  {data.stats.totalItems}
                </Text>
                <Text
                  className="mt-1 text-[10px] tracking-[1.4px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  ITEMS
                </Text>
              </View>
              <View className="my-1 w-px bg-[rgba(26,20,16,0.14)]" />
              <View className="flex-1 items-center py-1">
                <Text
                  className="text-[30px] leading-9 text-[#1A1410]"
                  style={BR_FONT_STYLE.displayExtraBold}
                >
                  {data.stats.participantCount}
                </Text>
                <Text
                  className="mt-1 text-[10px] tracking-[1.4px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  PEOPLE
                </Text>
              </View>
              <View className="my-1 w-px bg-[rgba(26,20,16,0.14)]" />
              <View className="flex-1 items-center py-1">
                <Text
                  className="text-[30px] leading-9 text-[#FF6A1F]"
                  style={BR_FONT_STYLE.displayExtraBold}
                >
                  ${(data.stats.totalAmount / 100).toFixed(2)}
                </Text>
                <Text
                  className="mt-1 text-[10px] tracking-[1.4px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  TOTAL
                </Text>
              </View>
            </View>

            <Rule />

            {/* Receipt code + dots */}
            <View className="items-center">
              <Text
                className="text-center text-xs tracking-[2.5px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                {receiptCode}
              </Text>
              <Text
                className="mt-1.5 text-center text-xs tracking-[5px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                · · · · · ·
              </Text>
            </View>
          </View>
          <TornEdge position="bottom" />
        </Animated.View>

        {/* Runner */}
        {runner && (
          <Animated.View
            entering={FadeInUp.duration(300).delay(120)}
            className="mt-7"
          >
            <Text
              className="mb-2.5 text-[11px] tracking-[1.4px] text-[#8A7A6E]"
              style={BR_FONT_STYLE.mono}
            >
              RUNNER
            </Text>
            <View className="overflow-hidden rounded-2xl border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2]">
              <View className="flex-row items-center gap-3 p-3.5">
                <BrAvatar
                  name={`${runner.firstName} ${runner.lastName}`.trim() || "R"}
                  avatarUrl={runner.avatarUrl ?? null}
                  size={44}
                />
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[15px] text-[#1A1410]"
                    style={BR_FONT_STYLE.display}
                  >
                    {`${runner.firstName} ${runner.lastName}`.trim()}
                  </Text>
                  <Text
                    className="mt-0.5 text-xs text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    {runner.itemCount}{" "}
                    {runner.itemCount === 1 ? "item" : "items"} · drove the run
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5 rounded-full border border-[rgba(255,197,66,0.5)] bg-[#FFF1C4] px-[9px] py-1">
                  <View className="h-[7px] w-[7px] rounded-full border-[1.5px] border-[#7A4A20]" />
                  <Text
                    className="text-[10px] tracking-[0.8px] text-[#7A4A20]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    RUNNER
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <Animated.View
            entering={FadeInUp.duration(300).delay(160)}
            className="mt-7"
          >
            <Text
              className="mb-2.5 text-[11px] tracking-[1.4px] text-[#8A7A6E]"
              style={BR_FONT_STYLE.mono}
            >{`PARTICIPANTS · ${participants.length}`}</Text>

            <View className="mt-2.5 gap-2.5">
              {participants.map((participant, idx) => {
                const name =
                  `${participant.firstName} ${participant.lastName}`.trim();
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
                      className="overflow-hidden rounded-2xl border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2]"
                    >
                      <View className="flex-row items-center gap-3 p-3.5">
                        <BrAvatar
                          name={name || "U"}
                          avatarUrl={participant.avatarUrl ?? null}
                          size={44}
                        />
                        <View className="min-w-0 flex-1">
                          <Text
                            className="text-[15px] text-[#1A1410]"
                            style={BR_FONT_STYLE.display}
                          >
                            {name || "Unknown"}
                          </Text>
                          <Text
                            className="mt-0.5 text-xs text-[#8A7A6E]"
                            style={BR_FONT_STYLE.mono}
                          >
                            {participant.itemCount}{" "}
                            {participant.itemCount === 1 ? "item" : "items"}
                            {participant.amountOwed > 0
                              ? ` · $${(participant.amountOwed / 100).toFixed(2)}`
                              : ""}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <View
                            className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
                            style={{ backgroundColor: chipConfig.bg }}
                          >
                            <View
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: chipConfig.dot }}
                            />
                            <Text
                              className="text-xs"
                              style={[
                                BR_FONT_STYLE.display,
                                { color: chipConfig.fg },
                              ]}
                            >
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
                        <View className="gap-2.5 border-t border-[rgba(26,20,16,0.08)] px-3.5 pb-3.5 pt-3">
                          {participant.items.map((item, iIdx) => (
                            <View
                              key={`${item.text}-${item.locationName ?? ""}-${item.priceInCents ?? "unpriced"}`}
                              className="flex-row items-start gap-2.5"
                            >
                              <Text
                                className="w-[22px] text-[13px] leading-5 text-[#8A7A6E]"
                                style={BR_FONT_STYLE.monoBold}
                              >
                                {String(iIdx + 1).padStart(2, "0")}
                              </Text>
                              <View className="flex-1">
                                <Text
                                  className="text-sm leading-5 text-[#1A1410]"
                                  style={BR_FONT_STYLE.display}
                                >
                                  {item.text}
                                </Text>
                                {item.locationName && (
                                  <Text
                                    className="mt-0.5 text-[10px] tracking-[0.8px] text-[#8A7A6E]"
                                    style={BR_FONT_STYLE.mono}
                                  >
                                    {item.locationName.toUpperCase()}
                                  </Text>
                                )}
                              </View>
                              {item.priceInCents !== null && (
                                <Text
                                  className="text-sm leading-5 text-[#1A1410]"
                                  style={BR_FONT_STYLE.mono}
                                >
                                  ${(item.priceInCents / 100).toFixed(2)}
                                </Text>
                              )}
                            </View>
                          ))}

                          {participant.amountOwed > 0 && (
                            <>
                              <View className="my-1 border-b border-dashed border-[rgba(26,20,16,0.14)]" />
                              <View className="flex-row items-center justify-between">
                                <Text
                                  className="text-[11px] tracking-wide text-[#4A3C32]"
                                  style={BR_FONT_STYLE.monoBold}
                                >
                                  {isSettled ? "AMOUNT PAID" : "AMOUNT OWED"}
                                </Text>
                                <Text
                                  className={`text-[22px] ${isSettled ? "text-[#2EBE7B]" : "text-[#FF4D6D]"}`}
                                  style={BR_FONT_STYLE.displayExtraBold}
                                >
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
    </SafeAreaView>
  );
}
