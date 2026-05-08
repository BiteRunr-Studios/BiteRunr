import { useState, useCallback, useEffect, useRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
  TouchableOpacity,
  InteractionManager,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PaymentSetupSplash } from "@/components/payment-setup-splash";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { EnterCodeModal } from "@/components/enter-code-modal";
import { BrAvatar, BrChip, BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";

type FilterType = "all" | "active" | "completed" | "needs_payment";
type TimeSection = "Today" | "This Week" | "Earlier";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Live" },
  { key: "completed", label: "Settled" },
  { key: "needs_payment", label: "Needs Payment" },
];

function groupByTime<T extends { order: { createdAt: number } }>(
  items: T[],
): { title: TimeSection; data: T[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - now.getDay() * 86400000;

  const groups: Record<TimeSection, T[]> = { Today: [], "This Week": [], Earlier: [] };
  for (const item of items) {
    if (item.order.createdAt >= startOfToday) groups.Today.push(item);
    else if (item.order.createdAt >= startOfWeek) groups["This Week"].push(item);
    else groups.Earlier.push(item);
  }

  return (["Today", "This Week", "Earlier"] as TimeSection[])
    .filter((t) => groups[t].length > 0)
    .map((t) => ({ title: t, data: groups[t] }));
}

const SECTION_ICONS: Record<TimeSection, React.ComponentProps<typeof Icon>["name"]> = {
  Today: "Flame",
  "This Week": "Calendar",
  Earlier: "Archive",
};

const ICON_PALETTE = [BR.orange, BR.lilac, BR.mint, BR.coral, BR.yolk, "#9DDF9D"];

type OrderItem = NonNullable<ReturnType<typeof useQuery<typeof api.orders.getWithDetails>>>[number];

function PulseDot({ active, color }: { active: boolean; color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 700 }), withTiming(1, { duration: 700 })),
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
    <View style={{ width: 6, height: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color, position: "absolute" }} />
      <Animated.View
        style={[{ width: 6, height: 6, borderRadius: 999, backgroundColor: color, position: "absolute" }, animStyle]}
      />
    </View>
  );
}

function RunCard({
  item,
  userId,
  onReorder,
}: {
  item: OrderItem;
  userId: string | undefined;
  onReorder: () => void;
}) {
  const { order, orderUsers, orderLocations, itemsCount } = item;
  const isActive = order.status === "active";
  const isCompleted = order.status === "completed";
  const isLive = isActive && order.paused; // runner has it
  const isOrdering = isActive && !order.paused; // collecting orders

  // tone
  let bg: string;
  let fg: string;
  let dotColor: string;
  let statusLabel: string;
  let cardBg: string;
  let cardBorder: string;

  if (isLive) {
    bg = BR.orangeSoft; fg = BR.orangeDeep; dotColor = BR.orange;
    statusLabel = "Live";
    cardBg = BR.orangeTint; cardBorder = "rgba(255,106,31,0.25)";
  } else if (isOrdering) {
    bg = BR.yolkSoft; fg = "#7A4A20"; dotColor = BR.yolk;
    statusLabel = "Ordering";
    cardBg = "#FFFDF5"; cardBorder = "rgba(255,197,66,0.3)";
  } else if (isCompleted) {
    bg = BR.mintSoft; fg = BR.mintInk; dotColor = BR.mint;
    statusLabel = "Settled";
    cardBg = BR.card; cardBorder = BR.line;
  } else {
    bg = BR.paper2; fg = BR.ink2; dotColor = BR.ink3;
    statusLabel = "Cancelled";
    cardBg = BR.card; cardBorder = BR.line;
  }

  const pulsing = isLive || isOrdering;

  const iconColor = ICON_PALETTE[(order.name?.charCodeAt(0) ?? 0) % ICON_PALETTE.length];
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

  return (
    <View
      style={[
        styles.runCard,
        { backgroundColor: cardBg, borderColor: cardBorder },
      ]}
    >
      {/* Top section */}
      <View style={styles.runCardTop}>
        {/* Icon tile */}
        <View style={[styles.iconTile, { backgroundColor: iconColor }]}>
          <Icon name="ShoppingBag" size={20} color="#fff" />
        </View>

        {/* Title block */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.runDateRow}>
            <Icon name="Calendar" size={11} color={BR.ink3} />
            <Text style={styles.runDateText}>{dateLabel}</Text>
          </View>
          <BrText weight="bold" style={{ fontSize: 17, marginTop: 2 }} numberOfLines={1}>
            {order.name}
          </BrText>
          {locationName ? (
            <View style={styles.locationRow}>
              <Icon name="MapPin" size={11} color={BR.orange} />
              <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
            </View>
          ) : null}
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: bg }]}>
          <PulseDot active={pulsing} color={dotColor} />
          <Text style={[styles.statusPillText, { color: fg }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Footer */}
      <View
        style={[
          styles.runCardFooter,
          { backgroundColor: pulsing ? "rgba(255,255,255,0.6)" : "rgba(252,239,224,0.4)" },
        ]}
      >
        {/* Avatars */}
        <View style={{ flexDirection: "row" }}>
          {users.slice(0, 4).map((u, i) => (
            <View key={u.id} style={{ marginLeft: i ? -8 : 0 }}>
              <BrAvatar
                name={u.name}
                avatarUrl={u.avatarUrl}
                size={26}
                ring={pulsing ? BR.orangeTint : "#fff"}
              />
            </View>
          ))}
        </View>

        <Text style={styles.footerPeople}>
          {users.length} {users.length === 1 ? "person" : "people"}
        </Text>
        <Text style={styles.footerMeta}>
          · {itemsCount ?? 0} {itemsCount === 1 ? "line" : "lines"}
        </Text>

        <View style={{ flex: 1 }} />

        {isCompleted ? (
          <TouchableOpacity onPress={onReorder} style={styles.againChip}>
            <Icon name="RotateCcw" size={11} color={BR.orangeDeep} />
            <Text style={styles.againChipText}>Again</Text>
          </TouchableOpacity>
        ) : (
          <Icon name="ArrowRight" size={16} color={BR.orange} />
        )}
      </View>
    </View>
  );
}

export default function GroupsTab() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (filter === "active" || filter === "completed" || filter === "needs_payment") {
      setActiveFilter(filter);
    } else {
      setActiveFilter("all");
    }
  }, [filter]);

  const [showPaymentSplash, setShowPaymentSplash] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showEnterCode, setShowEnterCode] = useState(false);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setIsTransitionComplete(true));
    return () => task.cancel();
  }, []);

  const currentUser = useQuery(api.users.getCurrentUser);
  const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
  const data = useQuery(api.orders.getWithDetails);
  const isPending = data === undefined || currentUser === undefined || !isTransitionComplete;
  const userId = currentUser?._id;

  const handleCreateOrder = useCallback(() => {
    if (connectedAccount?.chargesEnabled) {
      router.push("/order/create");
    } else {
      setShowPaymentSplash(true);
    }
  }, [connectedAccount]);

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
      return myOrderUser.settlementStatus === "unpaid" || myOrderUser.settlementStatus === "claimed";
    }
    return true;
  });

  const grouped = filteredOrders ? groupByTime(filteredOrders) : [];

  // Filter counts
  const allCount = data?.length ?? 0;
  const liveCount = data?.filter((i) => i.order.status === "active").length ?? 0;
  const doneCount = data?.filter((i) => i.order.status === "completed").length ?? 0;
  const countFor = (key: FilterType) => {
    if (key === "all") return allCount;
    if (key === "active") return liveCount;
    if (key === "completed") return doneCount;
    return 0;
  };

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: BR.paper, paddingTop: insets.top }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/icon-no-bg.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setShowScanner(true)} style={styles.iconBtn}>
              <Icon name="ScanLine" size={18} color={BR.ink} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 50 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 18 }}>
            {/* Title */}
            <Animated.View entering={FadeInUp.duration(400)} style={styles.titleRow}>
              <View>
                <BrText variant="eyebrow">
                  {allCount} {allCount === 1 ? "run" : "runs"} total
                </BrText>
                <BrText variant="h1" style={{ marginTop: 4 }}>
                  Your{" "}
                  <BrText variant="h1" italic color={BR.orange}>runs.</BrText>
                </BrText>
              </View>
            </Animated.View>

            {/* Filter row */}
            <Animated.View entering={FadeInUp.duration(400).delay(50)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={{ marginHorizontal: -18 }}
              >
                {FILTERS.map((f) => {
                  const active = activeFilter === f.key;
                  const count = countFor(f.key);
                  if (f.key === "needs_payment" && count === 0) return null;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setActiveFilter(f.key)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? BR.ink : BR.card,
                          borderColor: active ? BR.ink : BR.line,
                        },
                      ]}
                    >
                      <Text style={[styles.filterChipText, { color: active ? "#fff" : BR.ink2 }]}>
                        {f.label}
                      </Text>
                      <Text
                        style={[
                          styles.filterCount,
                          {
                            backgroundColor: active ? "rgba(255,255,255,0.18)" : BR.paper2,
                            color: active ? "#fff" : BR.ink3,
                          },
                        ]}
                      >
                        {count}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* New run pill */}
                <Pressable onPress={handleCreateOrder} style={styles.newRunChip}>
                  <Icon name="Plus" size={14} color="#fff" strokeWidth={3} />
                  <Text style={styles.newRunChipText}>New run</Text>
                </Pressable>
              </ScrollView>
            </Animated.View>

            {/* Skeleton */}
            {isPending && (
              <Skeleton>
                <View style={{ gap: 22, marginTop: 22 }}>
                  {[1, 2].map((g) => (
                    <View key={g} style={{ gap: 10 }}>
                      <SkeletonBlock width={100} height={14} />
                      {[1, 2].map((c) => (
                        <View key={c} style={{ borderRadius: BR_RADIUS.lg, overflow: "hidden" }}>
                          <SkeletonBlock width="100%" height={120} rounded="rounded-3xl" />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </Skeleton>
            )}

            {/* Content */}
            {!isPending && (
              <Animated.View entering={FadeInUp.duration(400).delay(100)}>
                {grouped.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 36 }}>🍽️</Text>
                    <BrText variant="h3" style={{ marginTop: 12 }}>No runs here</BrText>
                    <BrText style={{ fontSize: 13, color: BR.ink3, marginTop: 4, textAlign: "center" }}>
                      Try a different filter — or start something new.
                    </BrText>
                    <Pressable onPress={handleCreateOrder} style={styles.emptyBtn}>
                      <Icon name="Plus" size={16} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>New run</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 22, marginTop: 22 }}>
                    {grouped.map((section, gi) => (
                      <Animated.View
                        key={section.title}
                        entering={FadeInUp.duration(400).delay(100 + gi * 40)}
                      >
                        {/* Section header */}
                        <View style={styles.sectionHeader}>
                          <Icon name={SECTION_ICONS[section.title]} size={12} color={BR.ink3} />
                          <BrText variant="eyebrow">{section.title}</BrText>
                          <Text style={styles.sectionCount}>· {section.data.length}</Text>
                          <View style={styles.sectionLine} />
                        </View>

                        {/* Cards */}
                        <View style={{ gap: 10, marginTop: 10 }}>
                          {section.data.map((item) => {
                            const card = (
                              <RunCard
                                key={item.order.id}
                                item={item}
                                userId={userId}
                                onReorder={() => {
                                  const locationNamesParam = encodeURIComponent(
                                    JSON.stringify(item.orderLocations?.map((ol) => ol.name) ?? []),
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
                                <Link href={`/order/${item.order.id}`} key={item.order.id} asChild>
                                  <Pressable>{card}</Pressable>
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
                                  <Pressable>{card}</Pressable>
                                </Link>
                              );
                            }
                            return <View key={item.order.id}>{card}</View>;
                          })}
                        </View>
                      </Animated.View>
                    ))}

                    {/* End of list */}
                    <Text style={styles.endOfList}>
                      · end of {activeFilter === "all" ? "history" : activeFilter} ·
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </View>

      <PaymentSetupSplash
        visible={showPaymentSplash}
        onSetUp={() => { setShowPaymentSplash(false); router.push("/account/payments"); }}
        onSkip={() => { setShowPaymentSplash(false); router.push("/order/create"); }}
      />
      <QRScannerModal
        visible={showScanner}
        onScan={handleScanCode}
        onClose={() => setShowScanner(false)}
        onEnterCode={handleEnterCode}
      />
      <EnterCodeModal
        visible={showEnterCode}
        onSubmit={(code) => { setShowEnterCode(false); router.push(`/join/${encodeURIComponent(code)}`); }}
        onClose={() => setShowEnterCode(false)}
      />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterCount: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: BR_FONT.mono,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  newRunChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: BR.orange,
    marginLeft: "auto",
    shadowColor: BR.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  newRunChipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionCount: {
    fontFamily: BR_FONT.mono,
    fontSize: 10,
    color: BR.ink3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: BR.line,
  },
  runCard: {
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  runCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    paddingBottom: 12,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 0,
    elevation: 0,
  },
  runDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  runDateText: {
    fontFamily: BR_FONT.mono,
    fontSize: 11,
    color: BR.ink3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: BR.ink2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  runCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BR.line,
    borderStyle: "dashed",
  },
  footerPeople: {
    fontSize: 12,
    fontWeight: "600",
    color: BR.ink2,
  },
  footerMeta: {
    fontSize: 11,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  againChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
  },
  againChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: BR.orangeDeep,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginTop: 24,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: BR.line2,
    backgroundColor: BR.card,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: BR.orange,
    marginTop: 16,
  },
  endOfList: {
    textAlign: "center",
    fontSize: 11,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 8,
  },
});
