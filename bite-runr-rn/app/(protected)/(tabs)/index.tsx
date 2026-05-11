import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  Image,
  Pressable,
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
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useAction } from "convex/react";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { PaymentSetupSplash } from "@/components/payment-setup-splash";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { EnterCodeModal } from "@/components/enter-code-modal";
import { BrCard, BrChip, BrText, BrAvatar, BrSticker } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";

const SQUAD_COLOR_MAP: Record<string, string> = {
  orange: BR.orange,
  lilac: BR.lilac,
  mint: BR.mint,
  coral: BR.coral,
  yolk: BR.yolk,
};

function PulseDot({
  color = "#fff",
  size = 8,
}: {
  color?: string;
  size?: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [scale, opacity]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateLine(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function IconButton({
  name,
  onPress,
  badge,
}: {
  name: React.ComponentProps<typeof Icon>["name"];
  onPress?: () => void;
  badge?: number;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn}>
      <Icon name={name} size={18} color={BR.ink} />
      {badge && badge > 0 ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function HomeTab() {
  const activeOrders = useQuery(api.orders.getActiveOrders);
  const pastOrders = useQuery(api.orders.getPastOrders, { limit: 3 });
  const settlementSummary = useQuery(api.orders.getSettlementSummary);
  const outstandingDebts = useQuery(api.orders.getOutstandingDebts);
  const outstandingPayments = useQuery(api.orders.getOutstandingPayments);
  const frequentGroups = useQuery(api.orders.getFrequentGroups, {});
  const squads = useQuery(api.squads.list);
  const friends = useQuery(api.friends.list);
  const pendingRequests = useQuery(api.friends.pendingRequestCount);
  const currentUser = useQuery(api.users.getCurrentUser);
  const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
  const hasCreatedOrder = useQuery(api.orders.hasCurrentUserCreatedOrder);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const [showPaymentSplash, setShowPaymentSplash] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showEnterCode, setShowEnterCode] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState<number | null>(null);
  const getPayoutBalance = useAction(api.stripeConnect.getPayoutBalance);

  const hasStripe = connectedAccount?.chargesEnabled === true;

  const fetchBalance = useCallback(async () => {
    if (!hasStripe) return;
    try {
      const result = await getPayoutBalance({});
      setBalanceAmount(result.available + result.pending);
    } catch {
      // silent
    }
  }, [hasStripe, getPayoutBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsTransitionComplete(true);
    });
    return () => task.cancel();
  }, []);

  const handleCreateOrder = () => {
    if (connectedAccount?.chargesEnabled || hasCreatedOrder) {
      router.push("/order/create");
    } else {
      setShowPaymentSplash(true);
    }
  };

  const handleScanCode = (code: string) => {
    setShowScanner(false);
    router.push(`/join/${encodeURIComponent(code)}`);
  };

  const handleEnterCode = () => {
    setShowScanner(false);
    setTimeout(() => setShowEnterCode(true), 300);
  };

  const handleCodeSubmit = (code: string) => {
    setShowEnterCode(false);
    router.push(`/join/${encodeURIComponent(code)}`);
  };

  const queriesReturned =
    activeOrders !== undefined &&
    pastOrders !== undefined &&
    settlementSummary !== undefined &&
    outstandingDebts !== undefined &&
    outstandingPayments !== undefined &&
    frequentGroups !== undefined &&
    friends !== undefined &&
    pendingRequests !== undefined &&
    connectedAccount !== undefined &&
    hasCreatedOrder !== undefined;

  const hasAnyData =
    (activeOrders?.length ?? 0) > 0 ||
    (pastOrders?.length ?? 0) > 0 ||
    (settlementSummary?.owedToMe ?? 0) > 0 ||
    (settlementSummary?.iOwe ?? 0) > 0 ||
    (squads?.length ?? 0) > 0 ||
    (frequentGroups?.squads?.length ?? 0) > 0 ||
    (friends?.length ?? 0) > 0;

  useEffect(() => {
    if (!queriesReturned) return;
    if (hasAnyData) {
      setIsInitializing(false);
      return;
    }
    const timer = setTimeout(() => setIsInitializing(false), 1500);
    return () => clearTimeout(timer);
  }, [queriesReturned, hasAnyData]);

  const isLoading = !queriesReturned || isInitializing || !isTransitionComplete;
  const pendingRequestCount = pendingRequests ?? 0;
  const firstName = currentUser?.firstName || "there";
  const owedToMe = (settlementSummary?.owedToMe ?? 0) / 100;
  const iOwe = (settlementSummary?.iOwe ?? 0) / 100;
  const activeOrder = (activeOrders?.[0] ?? null) as
    | NonNullable<typeof activeOrders>[number]
    | null;

  return (
    <ErrorBoundary>
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BR.paper }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/icon-no-bg.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton name="ScanLine" onPress={() => setShowScanner(true)} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: 50 + insets.bottom,
            paddingHorizontal: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && <HomeSkeleton />}

          {!isLoading && (
            <>
              {/* Greeting */}
              <Animated.View
                entering={FadeInUp.duration(300)}
                style={styles.greetingRow}
              >
                <View style={{ flex: 1 }}>
                  <BrText variant="eyebrow">{formatDateLine()}</BrText>
                  <BrText variant="h1" style={{ marginTop: 6 }}>
                    {getGreeting()},{"\n"}
                    <BrText variant="h1" color={BR.orange}>
                      {firstName}.
                    </BrText>
                  </BrText>
                </View>
                {pastOrders && pastOrders.length >= 3 && (
                  <BrSticker
                    rotate={5}
                    leftSlot={<Icon name="Flame" size={14} color={BR.orange} />}
                  >
                    {pastOrders.length}+ runs
                  </BrSticker>
                )}
              </Animated.View>

              {/* Hero — active order */}
              {activeOrder && (
                <Animated.View
                  entering={FadeInUp.duration(300).delay(25)}
                  style={{ marginTop: 22 }}
                >
                  <Pressable
                    onPress={() => router.push(`/order/${activeOrder.id}`)}
                  >
                    <LinearGradient
                      colors={["#FF6A1F", "#FF8A4A", "#FFA866"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.heroCard}
                    >
                      <Text style={styles.heroWatermark}>R</Text>

                      <View style={styles.heroTopRow}>
                        <View style={styles.livePill}>
                          <PulseDot color="#fff" size={6} />
                          <Text style={styles.livePillText}>LIVE ORDER</Text>
                        </View>
                        <Text style={styles.heroMonoText}>
                          {activeOrder.orderUsers?.length ?? 0} in
                        </Text>
                      </View>

                      <BrText
                        variant="h2"
                        color="#fff"
                        style={{ marginTop: 14 }}
                      >
                        {activeOrder.name}
                      </BrText>

                      <View style={styles.heroAvatarRow}>
                        <View style={{ flexDirection: "row" }}>
                          {(activeOrder.orderUsers ?? [])
                            .slice(0, 4)
                            .map((u, i) => (
                              <View
                                key={u.id}
                                style={{
                                  marginLeft: i ? -10 : 0,
                                }}
                              >
                                <BrAvatar
                                  name={`${u.firstName ?? ""} ${u.lastName ?? ""}`}
                                  avatarUrl={u.avatarUrl ?? null}
                                  size={32}
                                  ring="#fff"
                                />
                              </View>
                            ))}
                        </View>
                        <View style={styles.heroOpenBtn}>
                          <Text style={styles.heroOpenBtnText}>Open run</Text>
                          <Icon
                            name="ArrowRight"
                            size={14}
                            color={BR.orangeDeep}
                          />
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              )}

              {/* New run CTA */}
              <Animated.View
                entering={FadeInUp.duration(300).delay(40)}
                style={{ marginTop: activeOrder ? 12 : 22 }}
              >
                <Pressable onPress={handleCreateOrder} style={styles.newRunCta}>
                  <View style={styles.newRunPlus}>
                    <Icon
                      name="Plus"
                      size={18}
                      color="#fff"
                      strokeWidth={2.5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.newRunTitle}>Start a new run</Text>
                    <Text style={styles.newRunSub}>
                      Invite squad · pick a spot · go
                    </Text>
                  </View>
                  <Icon
                    name="ArrowRight"
                    size={18}
                    color="#fff"
                    style={{ opacity: 0.7 }}
                  />
                </Pressable>
              </Animated.View>

              {/* Stats row */}
              {(owedToMe > 0 || iOwe > 0 || hasStripe) && (
                <Animated.View
                  entering={FadeInUp.duration(300).delay(30)}
                  style={styles.statsRow}
                >
                  {owedToMe > 0 && (
                    <Pressable
                      onPress={() => router.push("/groups?filter=active")}
                      style={[
                        styles.statCard,
                        {
                          backgroundColor: BR.mintSoft,
                          borderColor: "rgba(46,190,123,0.2)",
                          flex: 1.4,
                        },
                      ]}
                    >
                      <View style={styles.statHeaderRow}>
                        <Icon name="TrendingUp" size={14} color={BR.mintInk} />
                        <Text style={[styles.statLabel, { color: BR.mintInk }]}>
                          YOU&apos;RE OWED
                        </Text>
                      </View>
                      <Text style={[styles.statValue, { color: BR.mintInk }]}>
                        ${owedToMe.toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.statSub,
                          { color: BR.mintInk, opacity: 0.7 },
                        ]}
                      >
                        {outstandingDebts?.length ?? 0} pending
                      </Text>
                    </Pressable>
                  )}
                  {iOwe > 0 && (
                    <Pressable
                      onPress={() => {
                        const first = outstandingPayments?.[0];
                        if (first) {
                          router.push(
                            `/order/my-settlement?orderId=${first.orderId}`,
                          );
                        }
                      }}
                      style={[
                        styles.statCard,
                        {
                          backgroundColor: BR.coralSoft,
                          borderColor: "rgba(255,77,109,0.2)",
                          flex: 1,
                        },
                      ]}
                    >
                      <View style={styles.statHeaderRow}>
                        <Icon name="Hand" size={14} color={BR.coralInk} />
                        <Text
                          style={[styles.statLabel, { color: BR.coralInk }]}
                        >
                          YOU OWE
                        </Text>
                      </View>
                      <Text style={[styles.statValue, { color: BR.coralInk }]}>
                        ${iOwe.toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.statSub,
                          { color: BR.coralInk, opacity: 0.7 },
                        ]}
                      >
                        Settle now
                      </Text>
                    </Pressable>
                  )}
                  {hasStripe && balanceAmount !== null && owedToMe === 0 && (
                    <Pressable
                      onPress={() => router.push("/account/payments")}
                      style={[
                        styles.statCard,
                        {
                          backgroundColor: BR.lilacSoft,
                          borderColor: "rgba(110,91,255,0.2)",
                          flex: 1,
                        },
                      ]}
                    >
                      <View style={styles.statHeaderRow}>
                        <Icon name="Wallet" size={14} color={BR.lilacInk} />
                        <Text
                          style={[styles.statLabel, { color: BR.lilacInk }]}
                        >
                          BALANCE
                        </Text>
                      </View>
                      <Text style={[styles.statValue, { color: BR.lilacInk }]}>
                        ${(balanceAmount / 100).toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.statSub,
                          { color: BR.lilacInk, opacity: 0.7 },
                        ]}
                      >
                        Stripe payout
                      </Text>
                    </Pressable>
                  )}
                </Animated.View>
              )}

              {/* Squads */}
              {squads && squads.length > 0 && (
                <Animated.View
                  entering={FadeInUp.duration(300).delay(40)}
                  style={{ marginTop: 22 }}
                >
                  <View style={styles.sectionHeader}>
                    <BrText variant="h3">Your squads</BrText>
                    <Pressable
                      onPress={() => router.push("/account/friends")}
                      style={styles.smallChip}
                    >
                      <Text style={styles.smallChipText}>Manage</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingRight: 18 }}
                    style={{ marginHorizontal: -18, paddingHorizontal: 18 }}
                  >
                    {squads.map((squad) => {
                      const tileColor =
                        SQUAD_COLOR_MAP[squad.color] ?? BR.orange;
                      const memberIds = (squad.memberIds as string[]).join(",");
                      return (
                        <Pressable
                          key={squad.id}
                          onPress={() =>
                            router.push(
                              `/order/create?reorderFriendIds=${memberIds}`,
                            )
                          }
                        >
                          <BrCard
                            variant="outlined"
                            background={BR.card}
                            padding={14}
                            style={{ width: 200 }}
                          >
                            {/* Icon tile */}
                            <View
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                backgroundColor: tileColor,
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: 12,
                              }}
                            >
                              <Icon
                                name={
                                  squad.icon as React.ComponentProps<
                                    typeof Icon
                                  >["name"]
                                }
                                size={20}
                                color="#fff"
                              />
                            </View>

                            {/* Name */}
                            <BrText
                              weight="bold"
                              style={{ fontSize: 15 }}
                              numberOfLines={1}
                            >
                              {squad.name}
                            </BrText>

                            {/* Members row */}
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 10,
                              }}
                            >
                              <View style={{ flexDirection: "row" }}>
                                {squad.members.slice(0, 4).map((m, idx) => (
                                  <View
                                    key={m.id}
                                    style={{ marginLeft: idx ? -8 : 0 }}
                                  >
                                    <BrAvatar
                                      name={`${m.firstName ?? ""} ${m.lastName ?? ""}`}
                                      avatarUrl={m.avatarUrl}
                                      size={24}
                                      ring={BR.card}
                                    />
                                  </View>
                                ))}
                              </View>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: BR.ink3,
                                  fontFamily: BR_FONT.mono,
                                }}
                              >
                                {squad.members.length}{" "}
                                {squad.members.length === 1
                                  ? "person"
                                  : "people"}
                              </Text>
                            </View>
                          </BrCard>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </Animated.View>
              )}

              {/* Recent runs */}
              {pastOrders && pastOrders.length > 0 && (
                <Animated.View
                  entering={FadeInUp.duration(300).delay(25)}
                  style={{ marginTop: 22 }}
                >
                  <View style={styles.sectionHeader}>
                    <BrText variant="h3">Recent runs</BrText>
                  </View>
                  <View style={{ gap: 10 }}>
                    {pastOrders.map((order) => {
                      const colorPalette = [
                        BR.orange,
                        BR.lilac,
                        BR.mint,
                        BR.coral,
                      ];
                      const color =
                        colorPalette[
                          (order.name?.charCodeAt(0) || 0) % colorPalette.length
                        ];
                      return (
                        <Pressable
                          key={order.id}
                          onPress={() =>
                            router.push(
                              `/order/completed-order?orderId=${order.id}`,
                            )
                          }
                        >
                          <BrCard padding={14} style={styles.runRow}>
                            <View
                              style={[
                                styles.runIcon,
                                { backgroundColor: color },
                              ]}
                            >
                              <Icon name="ShoppingBag" size={20} color="#fff" />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <BrText
                                  weight="bold"
                                  style={{ fontSize: 14 }}
                                  numberOfLines={1}
                                >
                                  {order.name}
                                </BrText>
                                <Text style={styles.runDot}>·</Text>
                                <Text style={styles.runDate}>
                                  {new Date(order.createdAt).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric" },
                                  )}
                                </Text>
                              </View>
                              <View style={styles.runMetaRow}>
                                <Text style={styles.runMeta}>
                                  {order.itemsCount} items
                                </Text>
                                <Text style={styles.runMeta}>·</Text>
                                <Text style={styles.runMeta}>
                                  ${(Number(order.userAmount) / 100).toFixed(2)}
                                </Text>
                                <Text style={styles.runMeta}>·</Text>
                                <Text style={styles.runMeta}>
                                  {order.orderUsers.length} ppl
                                </Text>
                              </View>
                            </View>
                            <BrChip
                              color="orange"
                              leftSlot={
                                <Icon
                                  name="RotateCcw"
                                  size={11}
                                  color={BR.orangeDeep}
                                />
                              }
                            >
                              Again
                            </BrChip>
                          </BrCard>
                        </Pressable>
                      );
                    })}
                  </View>
                </Animated.View>
              )}

              {/* Empty state */}
              {!hasAnyData && (
                <Animated.View
                  entering={FadeInUp.duration(300).springify()}
                  style={styles.empty}
                >
                  <View style={styles.emptyIcon}>
                    <Icon name="Utensils" size={44} color={BR.orange} />
                  </View>
                  <BrText variant="h3" style={{ marginTop: 18 }}>
                    Welcome to BiteRunr
                  </BrText>
                  <BrText
                    style={{
                      marginTop: 6,
                      textAlign: "center",
                      color: BR.ink3,
                      fontSize: 14,
                    }}
                  >
                    Start your first group run to see your dashboard here.
                  </BrText>
                </Animated.View>
              )}
            </>
          )}
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
        onSubmit={handleCodeSubmit}
        onClose={() => setShowEnterCode(false)}
      />
    </ErrorBoundary>
  );
}

function HomeSkeleton() {
  return (
    <Skeleton>
      <View style={{ paddingTop: 16, gap: 22 }}>
        <View style={{ gap: 8 }}>
          <SkeletonBlock width={140} height={14} />
          <SkeletonBlock width={220} height={32} />
        </View>
        <SkeletonBlock width="100%" height={140} rounded="rounded-3xl" />
        <SkeletonBlock width="100%" height={66} rounded="rounded-2xl" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SkeletonBlock width="50%" height={92} rounded="rounded-3xl" />
          <SkeletonBlock width="46%" height={92} rounded="rounded-3xl" />
        </View>
        <View style={{ gap: 10 }}>
          <SkeletonBlock width={140} height={20} />
          <SkeletonBlock width="100%" height={120} rounded="rounded-3xl" />
        </View>
      </View>
    </Skeleton>
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
  iconBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: BR.coral,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: BR.paper,
  },
  iconBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
  },
  heroCard: {
    borderRadius: BR_RADIUS.lg,
    padding: 18,
    overflow: "hidden",
    ...BR_SHADOW.primary,
  },
  heroWatermark: {
    position: "absolute",
    right: -14,
    bottom: -22,
    fontFamily: BR_FONT.displayExtraBold,
    fontStyle: "italic",
    fontSize: 200,
    lineHeight: 200,
    color: "rgba(255,255,255,0.12)",
    letterSpacing: -16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  livePillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroMonoText: {
    marginLeft: "auto",
    fontFamily: BR_FONT.mono,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  heroAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 18,
  },
  heroOpenBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  heroOpenBtnText: {
    color: BR.orangeDeep,
    fontWeight: "700",
    fontSize: 13,
  },
  newRunCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BR.ink,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: BR_RADIUS.lg,
  },
  newRunPlus: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: BR.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  newRunTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  newRunSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    padding: 14,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  statValue: {
    fontFamily: BR_FONT.display,
    fontWeight: "700",
    fontSize: 30,
    marginTop: 8,
    letterSpacing: -1,
  },
  statSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  smallChip: {
    backgroundColor: BR.paper2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: BR.ink2,
  },
  squadMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  runRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  runIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  runDot: {
    fontSize: 11,
    color: BR.ink3,
  },
  runDate: {
    fontSize: 11,
    color: BR.ink3,
  },
  runMetaRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  runMeta: {
    fontSize: 12,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: BR.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
