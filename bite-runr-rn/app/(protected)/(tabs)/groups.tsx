import { useState, useCallback, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
  TouchableOpacity,
  InteractionManager,
} from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "@/components/common/animated-pressable";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PaymentSetupSplash } from "@/components/payment-setup-splash";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { EnterCodeModal } from "@/components/enter-code-modal";
import { BrAvatar, BrText } from "@/components/br";
import { BR } from "@/lib/br-theme";

type FilterType = "all" | "active" | "completed" | "needs_payment";
type TimeSection = "Today" | "This Week" | "Earlier";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "active", label: "Live" },
  { key: "all", label: "History" },
  { key: "completed", label: "Settled" },
  { key: "needs_payment", label: "Needs Payment" },
];

const END_OF_LABELS: Record<FilterType, string> = {
  all: "history",
  active: "live",
  completed: "settled",
  needs_payment: "needs payment",
};

function groupByTime<T extends { order: { createdAt: number } }>(
  items: T[],
): { title: TimeSection; data: T[] }[] {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfWeek = startOfToday - now.getDay() * 86400000;

  const groups: Record<TimeSection, T[]> = {
    Today: [],
    "This Week": [],
    Earlier: [],
  };
  for (const item of items) {
    if (item.order.createdAt >= startOfToday) groups.Today.push(item);
    else if (item.order.createdAt >= startOfWeek)
      groups["This Week"].push(item);
    else groups.Earlier.push(item);
  }

  return (["Today", "This Week", "Earlier"] as TimeSection[])
    .filter((t) => groups[t].length > 0)
    .map((t) => ({ title: t, data: groups[t] }));
}

const SECTION_ICONS: Record<
  TimeSection,
  React.ComponentProps<typeof Icon>["name"]
> = {
  Today: "Flame",
  "This Week": "Calendar",
  Earlier: "Archive",
};

type OrderItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.orders.getWithDetails>>
>[number];

function PulseDot({ active, dotClass }: { active: boolean; dotClass: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
    }
  }, [active, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View className="h-1.5 w-1.5">
      <View className={`absolute h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <Animated.View
        className={`absolute h-1.5 w-1.5 rounded-full ${dotClass}`}
        style={animStyle}
      />
    </View>
  );
}

function RunCard({
  item,
  onReorder,
}: {
  item: OrderItem;
  onReorder: () => void;
}) {
  const { order, orderUsers, orderLocations, itemsCount } = item;
  const isActive = order.status === "active";
  const isCompleted = order.status === "completed";
  const isLive = isActive && order.paused; // runner has it
  const isOrdering = isActive && !order.paused; // collecting orders

  const tone = isLive
    ? {
        iconBg: "bg-[#FFE7D4]",
        statusBg: "bg-[#FFE7D4]",
        statusText: "text-[#E8551A]",
        dotClass: "bg-[#FF6A1F]",
        iconColor: BR.orangeDeep,
        statusLabel: "Live",
        cardBorder: "border-[rgba(255,106,31,0.25)]",
      }
    : isOrdering
      ? {
          iconBg: "bg-[#FFF1C4]",
          statusBg: "bg-[#FFF1C4]",
          statusText: "text-[#7A4A20]",
          dotClass: "bg-[#FFC542]",
          iconColor: "#7A4A20",
          statusLabel: "Ordering",
          cardBorder: "border-[rgba(255,197,66,0.3)]",
        }
      : isCompleted
        ? {
            iconBg: "bg-[#DDF5E8]",
            statusBg: "bg-[#DDF5E8]",
            statusText: "text-[#1B6B43]",
            dotClass: "bg-[#2EBE7B]",
            iconColor: BR.mintInk,
            statusLabel: "Settled",
            cardBorder: "border-[rgba(26,20,16,0.08)]",
          }
        : {
            iconBg: "bg-[#FCEFE0]",
            statusBg: "bg-[#FCEFE0]",
            statusText: "text-[#4A3C32]",
            dotClass: "bg-[#8A7A6E]",
            iconColor: BR.ink2,
            statusLabel: "Cancelled",
            cardBorder: "border-[rgba(26,20,16,0.08)]",
          };

  const gradientColors: readonly [string, string] = [BR.orangeTint, "#ffffff"];

  const pulsing = isLive || isOrdering;
  const locationName = orderLocations?.[0]?.name;

  const createdDate = new Date(order.createdAt);
  const dateLabel = createdDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const users = orderUsers.map((ou) => ({
    id: ou.id,
    name: `${ou.user?.firstName ?? ""} ${ou.user?.lastName ?? ""}`,
    avatarUrl: ou.user?.avatarUrl ?? null,
  }));

  const cardContent = (
    <>
      {/* Top section */}
      <View className="flex-row items-start gap-3 p-3.5 pb-3">
        {/* Icon tile */}
        <View
          className={`h-11 w-11 shrink-0 items-center justify-center rounded-[14px] shadow-[0_3px_0_rgba(0,0,0,0.08)] ${tone.iconBg}`}
        >
          <Icon name="ShoppingBag" size={20} color={tone.iconColor} />
        </View>

        {/* Title block */}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1">
            <Icon name="Calendar" size={11} color={BR.ink3} />
            <Text className="font-['JetBrainsMono_500Medium'] text-[11px] text-[#8A7A6E]">
              {dateLabel}
            </Text>
          </View>
          <BrText
            weight="bold"
            className="mt-0.5 text-[17px]"
            numberOfLines={1}
          >
            {order.name}
          </BrText>
          {locationName ? (
            <View className="mt-0.5 flex-row items-center gap-1">
              <Icon name="MapPin" size={11} color={BR.orange} />
              <Text className="text-xs text-[#4A3C32]" numberOfLines={1}>
                {locationName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Status pill */}
        <View
          className={`shrink-0 flex-row items-center gap-1.5 rounded-full px-2.5 py-[5px] ${tone.statusBg}`}
        >
          <PulseDot active={pulsing} dotClass={tone.dotClass} />
          <Text className={`text-[11px] font-bold ${tone.statusText}`}>
            {tone.statusLabel}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View
        className={`flex-row items-center gap-2 border-t border-dashed border-[rgba(26,20,16,0.08)] px-3.5 py-2.5 ${
          pulsing ? "bg-[rgba(255,255,255,0.6)]" : "bg-[rgba(252,239,224,0.4)]"
        }`}
      >
        {/* Avatars */}
        <View className="flex-row">
          {users.slice(0, 4).map((u, i) => (
            <View key={u.id} className={i ? "-ml-2" : ""}>
              <BrAvatar
                name={u.name}
                avatarUrl={u.avatarUrl}
                size={26}
                ring={pulsing ? BR.orangeTint : "#fff"}
              />
            </View>
          ))}
        </View>

        <Text className="text-xs font-semibold text-[#4A3C32]">
          {users.length} {users.length === 1 ? "person" : "people"}
        </Text>
        <Text className="font-['JetBrainsMono_500Medium'] text-[11px] text-[#8A7A6E]">
          · {itemsCount ?? 0} {itemsCount === 1 ? "item" : "items"}
        </Text>

        <View className="flex-1" />

        {isCompleted ? (
          <TouchableOpacity
            onPress={onReorder}
            className="flex-row items-center gap-1 rounded-full bg-[#FFE7D4] px-2.5 py-1.5"
          >
            <Icon name="RotateCcw" size={11} color={BR.orangeDeep} />
            <Text className="text-[11px] font-bold text-[#E8551A]">Again</Text>
          </TouchableOpacity>
        ) : (
          <Icon name="ArrowRight" size={16} color={BR.orange} />
        )}
      </View>
    </>
  );

  return (
    <View
      className={`overflow-hidden rounded-[22px] border ${tone.cardBorder}`}
    >
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.65]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {cardContent}
      </LinearGradient>
    </View>
  );
}

export default function GroupsTab() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [activeFilter, setActiveFilter] = useState<FilterType>("active");

  useEffect(() => {
    if (
      filter === "all" ||
      filter === "completed" ||
      filter === "needs_payment"
    ) {
      setActiveFilter(filter);
    } else {
      setActiveFilter("active");
    }
  }, [filter]);

  const [showPaymentSplash, setShowPaymentSplash] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showEnterCode, setShowEnterCode] = useState(false);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() =>
      setIsTransitionComplete(true),
    );
    return () => task.cancel();
  }, []);

  const currentUser = useQuery(api.users.getCurrentUser);
  const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
  const hasCreatedOrder = useQuery(api.orders.hasCurrentUserCreatedOrder);
  const data = useQuery(api.orders.getWithDetails);
  const isPending =
    data === undefined ||
    currentUser === undefined ||
    connectedAccount === undefined ||
    hasCreatedOrder === undefined ||
    !isTransitionComplete;
  const userId = currentUser?._id;

  const handleCreateOrder = useCallback(() => {
    if (connectedAccount?.chargesEnabled || hasCreatedOrder) {
      router.push("/order/create");
    } else {
      setShowPaymentSplash(true);
    }
  }, [connectedAccount, hasCreatedOrder]);

  const handleScanCode = (code: string) => {
    setShowScanner(false);
    router.push(`/join/${encodeURIComponent(code)}`);
  };
  const handleEnterCode = () => {
    setShowScanner(false);
    setTimeout(() => setShowEnterCode(true), 300);
  };

  const filteredOrders = data?.filter((item) => {
    if (!userId) return false;
    const myOrderUser = item.orderUsers.find((ou) => ou.userId === userId);
    if (!myOrderUser) return false;
    if (activeFilter === "active") return item.order.status === "active";
    if (activeFilter === "completed") return item.order.status === "completed";
    if (activeFilter === "needs_payment") {
      if (item.order.status !== "active" || !item.order.paused) return false;
      if (item.order.creatorId === userId) return false;
      if (Number(myOrderUser.amountOwed) <= 0) return false;
      return (
        myOrderUser.settlementStatus === "unpaid" ||
        myOrderUser.settlementStatus === "claimed"
      );
    }
    return true;
  });

  const grouped = filteredOrders ? groupByTime(filteredOrders) : [];

  // Filter counts
  const allCount = data?.length ?? 0;
  const liveCount =
    data?.filter((i) => i.order.status === "active").length ?? 0;
  const doneCount =
    data?.filter((i) => i.order.status === "completed").length ?? 0;
  const needsPaymentCount =
    data?.filter((item) => {
      if (!userId) return false;
      const myOrderUser = item.orderUsers.find((ou) => ou.userId === userId);
      if (!myOrderUser) return false;
      if (item.order.status !== "active" || !item.order.paused) return false;
      if (item.order.creatorId === userId) return false;
      if (Number(myOrderUser.amountOwed) <= 0) return false;
      return (
        myOrderUser.settlementStatus === "unpaid" ||
        myOrderUser.settlementStatus === "claimed"
      );
    }).length ?? 0;
  const countFor = (key: FilterType) => {
    if (key === "all") return allCount;
    if (key === "active") return liveCount;
    if (key === "completed") return doneCount;
    if (key === "needs_payment") return needsPaymentCount;
    return 0;
  };

  return (
    <ErrorBoundary>
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-[18px] pt-3 pb-2">
          <Image
            source={require("@/assets/images/icon-no-bg.png")}
            className="h-11 w-11"
            resizeMode="contain"
          />
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setShowScanner(true)}
              className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
            >
              <Icon name="ScanLine" size={18} color={BR.ink} />
            </Pressable>
            <AnimatedPressable
              scale={0.93}
              onPress={handleCreateOrder}
              className="h-[38px] flex-row items-center gap-1.5 rounded-full bg-[#FF6A1F] px-3.5 shadow-[0_2px_4px_rgba(255,106,31,0.18)]"
            >
              <Icon name="Plus" size={14} color="#fff" strokeWidth={3} />
              <Text className="text-[13px] font-bold text-white">New run</Text>
            </AnimatedPressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 50 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-[18px]">
            {/* Title */}
            <Animated.View
              entering={FadeInUp.duration(300)}
              className="mb-1 mt-2.5"
            >
              <BrText variant="eyebrow">
                {allCount} {allCount === 1 ? "run" : "runs"} total
              </BrText>
              <BrText variant="h1" className="mt-1">
                Your{" "}
                <BrText variant="h1" color={BR.orange}>
                  runs.
                </BrText>
              </BrText>
            </Animated.View>

            {/* Filter row */}
            <Animated.View entering={FadeInUp.duration(300).delay(25)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="flex-row gap-1.5 px-[18px] pt-2.5 pb-4"
                className="-mx-[18px]"
              >
                {FILTERS.map((f) => {
                  const active = activeFilter === f.key;
                  const count = countFor(f.key);
                  if (f.key === "needs_payment" && count === 0) return null;
                  return (
                    <AnimatedPressable
                      key={f.key}
                      scale={0.93}
                      onPress={() => setActiveFilter(f.key)}
                      className={`flex-row items-center gap-1.5 rounded-full border py-2 px-3 ${
                        active
                          ? "border-[#1A1410] bg-[#1A1410]"
                          : "border-[rgba(26,20,16,0.08)] bg-white"
                      }`}
                    >
                      <Text
                        className={`text-[13px] font-semibold ${
                          active ? "text-white" : "text-[#4A3C32]"
                        }`}
                      >
                        {f.label}
                      </Text>
                      <Text
                        className={`overflow-hidden rounded-full px-1.5 py-px font-['JetBrainsMono_500Medium'] text-[10px] font-semibold ${
                          active
                            ? "bg-[rgba(255,255,255,0.18)] text-white"
                            : "bg-[#FCEFE0] text-[#8A7A6E]"
                        }`}
                      >
                        {count}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* Skeleton */}
            {isPending && (
              <Skeleton>
                <View className="mt-[22px] gap-[22px]">
                  {[1, 2].map((g) => (
                    <View key={g} className="gap-2.5">
                      <SkeletonBlock width={100} height={14} />
                      {[1, 2].map((c) => (
                        <View
                          key={c}
                          className="overflow-hidden rounded-[22px]"
                        >
                          <SkeletonBlock
                            width="100%"
                            height={120}
                            rounded="rounded-3xl"
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </Skeleton>
            )}

            {/* Content */}
            {!isPending && (
              <Animated.View entering={FadeInUp.duration(300).delay(25)}>
                {grouped.length === 0 ? (
                  <View className="mt-6 items-center rounded-[22px] border border-dashed border-[rgba(26,20,16,0.14)] bg-white px-6 py-10">
                    <Text className="text-4xl">🍽️</Text>
                    <BrText variant="h3" className="mt-3">
                      No runs here
                    </BrText>
                    <BrText className="mt-1 text-center text-[13px] text-[#8A7A6E]">
                      Try a different filter — or start something new.
                    </BrText>
                    <Pressable
                      onPress={handleCreateOrder}
                      className="mt-4 flex-row items-center gap-2 rounded-full bg-[#FF6A1F] px-5 py-3"
                    >
                      <Icon name="Plus" size={16} color="#fff" />
                      <Text className="text-sm font-bold text-white">
                        New run
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="mt-[22px] gap-[22px]">
                    {grouped.map((section, gi) => (
                      <Animated.View
                        key={section.title}
                        entering={FadeInUp.duration(300).delay(50 + gi * 20)}
                      >
                        {/* Section header */}
                        <View className="flex-row items-center gap-2">
                          <Icon
                            name={SECTION_ICONS[section.title]}
                            size={12}
                            color={BR.ink3}
                          />
                          <BrText variant="eyebrow">{section.title}</BrText>
                          <Text className="font-['JetBrainsMono_500Medium'] text-[10px] text-[#8A7A6E]">
                            · {section.data.length}
                          </Text>
                          <View className="h-px flex-1 bg-[rgba(26,20,16,0.08)]" />
                        </View>

                        {/* Cards */}
                        <View className="mt-2.5 gap-2.5">
                          {section.data.map((item) => {
                            const card = (
                              <RunCard
                                key={item.order.id}
                                item={item}
                                onReorder={() => {
                                  const locationNamesParam = encodeURIComponent(
                                    JSON.stringify(
                                      item.orderLocations?.map(
                                        (ol) => ol.name,
                                      ) ?? [],
                                    ),
                                  );
                                  const friendIds = item.orderUsers
                                    .filter((ou) => ou.userId !== userId)
                                    .map((ou) => ou.userId)
                                    .join(",");
                                  router.push(
                                    `/order/create?reorderName=${encodeURIComponent(item.order.name)}&reorderLocationNames=${locationNamesParam}&reorderFriendIds=${friendIds}`,
                                  );
                                }}
                              />
                            );

                            if (item.order.status === "active") {
                              return (
                                <Link
                                  href={`/order/${item.order.id}`}
                                  key={item.order.id}
                                  asChild
                                >
                                  <AnimatedPressable scale={0.98}>
                                    {card}
                                  </AnimatedPressable>
                                </Link>
                              );
                            }
                            if (item.order.status === "completed") {
                              return (
                                <Link
                                  href={`/order/completed-order?orderId=${item.order.id}`}
                                  key={item.order.id}
                                  asChild
                                >
                                  <AnimatedPressable scale={0.98}>
                                    {card}
                                  </AnimatedPressable>
                                </Link>
                              );
                            }
                            return <View key={item.order.id}>{card}</View>;
                          })}
                        </View>
                      </Animated.View>
                    ))}

                    {/* End of list */}
                    <Text className="mb-2 mt-1 text-center font-['JetBrainsMono_500Medium'] text-[11px] uppercase tracking-wide text-[#8A7A6E]">
                      · end of {END_OF_LABELS[activeFilter]} ·
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <PaymentSetupSplash
        visible={showPaymentSplash}
        onSetUp={() => {
          setShowPaymentSplash(false);
          router.push("/account/payments");
        }}
        onSkip={() => {
          setShowPaymentSplash(false);
          router.push("/order/create");
        }}
      />
      <QRScannerModal
        visible={showScanner}
        onScan={handleScanCode}
        onClose={() => setShowScanner(false)}
        onEnterCode={handleEnterCode}
      />
      <EnterCodeModal
        visible={showEnterCode}
        onSubmit={(code) => {
          setShowEnterCode(false);
          router.push(`/join/${encodeURIComponent(code)}`);
        }}
        onClose={() => setShowEnterCode(false)}
      />
    </ErrorBoundary>
  );
}
