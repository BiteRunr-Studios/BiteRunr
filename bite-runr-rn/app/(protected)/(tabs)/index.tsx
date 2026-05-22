import type React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  Image,
  Pressable,
  InteractionManager,
} from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useAction } from "convex/react";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { PaymentSetupSplash } from "@/components/payment-setup-splash";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { EnterCodeModal } from "@/components/enter-code-modal";
import { BrCard, BrChip, BrText, BrAvatar, BrSticker } from "@/components/br";
import { BR } from "@/lib/br-theme";

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
      className="rounded-full"
      style={[{ width: size, height: size, backgroundColor: color }, animStyle]}
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
    <Pressable
      onPress={onPress}
      className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
    >
      <Icon name={name} size={18} color={BR.ink} />
      {badge && badge > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-lg border-[1.5px] border-[#FFF7EE] bg-[#FF4D6D] px-1">
          <Text className="text-[9px] font-extrabold text-white">{badge}</Text>
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
  const _pendingRequestCount = pendingRequests ?? 0;
  const firstName = currentUser?.firstName || "there";
  const owedToMe = (settlementSummary?.owedToMe ?? 0) / 100;
  const iOwe = (settlementSummary?.iOwe ?? 0) / 100;
  const activeOrder = (activeOrders?.[0] ?? null) as
    | NonNullable<typeof activeOrders>[number]
    | null;

  return (
    <ErrorBoundary>
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-[18px] pb-2 pt-3">
          <Image
            source={require("@/assets/images/icon-no-bg.png")}
            className="h-11 w-11"
            resizeMode="contain"
          />
          <View className="flex-row gap-2">
            <IconButton name="ScanLine" onPress={() => setShowScanner(true)} />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 50 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-[18px]">
            {isLoading && <HomeSkeleton />}

            {!isLoading && (
              <>
                {/* Greeting */}
                <Animated.View
                  entering={FadeInUp.duration(300)}
                  className="mt-2.5 flex-row items-end justify-between"
                >
                  <View className="flex-1">
                    <BrText variant="eyebrow">{formatDateLine()}</BrText>
                    <BrText variant="h1" className="mt-1.5">
                      {getGreeting()},{"\n"}
                      <BrText variant="h1" color={BR.orange}>
                        {firstName}.
                      </BrText>
                    </BrText>
                  </View>
                  {pastOrders && pastOrders.length >= 3 && (
                    <BrSticker
                      rotate={5}
                      leftSlot={
                        <Icon name="Flame" size={14} color={BR.orange} />
                      }
                    >
                      <Text>{pastOrders.length}+ runs</Text>
                    </BrSticker>
                  )}
                </Animated.View>

                {/* Hero — active order */}
                {activeOrder && (
                  <Animated.View
                    entering={FadeInUp.duration(300).delay(25)}
                    className="mt-[22px]"
                  >
                    <Pressable
                      onPress={() => router.push(`/order/${activeOrder.id}`)}
                    >
                      <View className="overflow-hidden rounded-[22px] shadow-[0_8px_16px_rgba(255,106,31,0.45)]">
                        <LinearGradient
                          colors={["#FF6A1F", "#FF8A4A", "#FFA866"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View className="p-[18px]">
                            <Text className="absolute -bottom-[22px] -right-3.5 font-['BricolageGrotesque_800ExtraBold'] text-[200px] italic leading-[200px] tracking-[-16px] text-white/10">
                              R
                            </Text>

                            <View className="flex-row items-center gap-2">
                              <View className="flex-row items-center gap-1.5 rounded-full bg-white/20 px-[9px] py-1">
                                <PulseDot color="#fff" size={6} />
                                <Text className="text-[11px] font-bold tracking-[0.8px] text-white">
                                  LIVE ORDER
                                </Text>
                              </View>
                            </View>

                            <BrText
                              variant="h2"
                              color="#fff"
                              className="mt-3.5"
                            >
                              {activeOrder.name}
                            </BrText>

                            <View className="mt-[18px] flex-row items-center gap-3.5">
                              <View className="flex-row">
                                {(activeOrder.orderUsers ?? [])
                                  .slice(0, 4)
                                  .map((u, i) => (
                                    <View
                                      key={u.id}
                                      className={i ? "-ml-2.5" : ""}
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
                              <View className="ml-auto flex-row items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5">
                                <Text className="text-[13px] font-bold text-[#E8551A]">
                                  Open run
                                </Text>
                                <Icon
                                  name="ArrowRight"
                                  size={14}
                                  color={BR.orangeDeep}
                                />
                              </View>
                            </View>
                          </View>
                        </LinearGradient>
                      </View>
                    </Pressable>
                  </Animated.View>
                )}

                {/* New run CTA */}
                <Animated.View
                  entering={FadeInUp.duration(300).delay(40)}
                  className={activeOrder ? "mt-3" : "mt-[22px]"}
                >
                  <Pressable
                    onPress={handleCreateOrder}
                    className="flex-row items-center gap-3 rounded-[22px] bg-[#1A1410] px-[18px] py-4"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-[#FF6A1F]">
                      <Icon
                        name="Plus"
                        size={18}
                        color="#fff"
                        strokeWidth={2.5}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-white">
                        Start a new run
                      </Text>
                      <Text className="mt-0.5 text-xs text-white/65">
                        Invite friends · pick a spot · go
                      </Text>
                    </View>
                    <View className="opacity-70">
                      <Icon name="ArrowRight" size={18} color="#fff" />
                    </View>
                  </Pressable>
                </Animated.View>

                {/* Stats row */}
                {(owedToMe > 0 ||
                  iOwe > 0 ||
                  (hasStripe && balanceAmount !== null && owedToMe === 0)) && (
                  <Animated.View
                    entering={FadeInUp.duration(300).delay(30)}
                    className="mt-3.5 flex-row gap-2.5"
                  >
                    {owedToMe > 0 && (
                      <Pressable
                        onPress={() => {
                          const first = outstandingDebts?.[0];
                          if (first) {
                            router.push(
                              `/order/settlement?orderId=${first.orderId}`,
                            );
                          }
                        }}
                        className="flex-[1.4] rounded-[22px] border border-[rgba(46,190,123,0.2)] bg-[#DDF5E8] p-3.5"
                      >
                        {/* Top row: label + stacked avatars */}
                        <View className="flex-row items-start justify-between">
                          <View className="flex-row items-center gap-2">
                            <Icon
                              name="TrendingUp"
                              size={12}
                              color={BR.mintInk}
                            />
                            <Text className="text-[11px] font-bold tracking-[0.6px] text-[#1B6B43]">
                              YOU&apos;RE OWED
                            </Text>
                          </View>
                          {outstandingDebts && outstandingDebts.length > 0 && (
                            <View className="flex-row">
                              {outstandingDebts.slice(0, 3).map((d, i) => (
                                <View
                                  key={d.userId}
                                  className={i ? "-ml-2.5" : ""}
                                >
                                  <BrAvatar
                                    name={`${d.firstName} ${d.lastName}`}
                                    avatarUrl={d.avatarUrl}
                                    size={26}
                                    ring={BR.mintSoft}
                                  />
                                </View>
                              ))}
                            </View>
                          )}
                        </View>

                        {/* Amount */}
                        <Text className="mt-2 font-['BricolageGrotesque_700Bold'] text-[30px] font-bold tracking-[-1px] text-[#1B6B43]">
                          ${owedToMe.toFixed(2)}
                        </Text>

                        {/* Bottom row: name + collect pill */}
                        <View className="mt-2 flex-row items-center gap-2">
                          <Text
                            className="flex-1 text-[11px] text-[#1B6B43]/75"
                            numberOfLines={1}
                          >
                            {outstandingDebts && outstandingDebts.length === 1
                              ? `${outstandingDebts[0].firstName} owes you`
                              : `${outstandingDebts?.length ?? 0} people owe you`}
                          </Text>
                          <View className="flex-row items-center gap-1 rounded-full bg-[rgba(46,190,123,0.18)] px-[9px] py-1">
                            <Text className="text-[11px] font-bold text-[#1B6B43]">
                              Collect
                            </Text>
                            <Icon
                              name="ArrowRight"
                              size={10}
                              color={BR.mintInk}
                            />
                          </View>
                        </View>
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
                        className="flex-1 rounded-[22px] border border-[rgba(255,77,109,0.2)] bg-[#FFE0E6] p-3.5"
                      >
                        <View className="flex-row items-center gap-2">
                          <Icon name="Hand" size={14} color={BR.coralInk} />
                          <Text className="text-[11px] font-bold tracking-[0.6px] text-[#B82340]">
                            YOU OWE
                          </Text>
                        </View>
                        <Text className="mt-2 font-['BricolageGrotesque_700Bold'] text-[30px] font-bold tracking-[-1px] text-[#B82340]">
                          ${iOwe.toFixed(2)}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-[#B82340]/70">
                          Settle now
                        </Text>
                      </Pressable>
                    )}
                    {hasStripe && balanceAmount !== null && owedToMe === 0 && (
                      <Pressable
                        onPress={() => router.push("/account/payments")}
                        className="flex-1 rounded-[22px] border border-[rgba(110,91,255,0.2)] bg-[#E6E2FF] p-3.5"
                      >
                        <View className="flex-row items-center gap-2">
                          <Icon name="Wallet" size={14} color={BR.lilacInk} />
                          <Text className="text-[11px] font-bold tracking-[0.6px] text-[#3A2DC2]">
                            BALANCE
                          </Text>
                        </View>
                        <Text className="mt-2 font-['BricolageGrotesque_700Bold'] text-[30px] font-bold tracking-[-1px] text-[#3A2DC2]">
                          ${(balanceAmount / 100).toFixed(2)}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-[#3A2DC2]/70">
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
                    className="mt-[22px]"
                  >
                    <View className="mb-2.5 flex-row items-baseline justify-between">
                      <BrText variant="h3">Your squads</BrText>
                      <Pressable
                        onPress={() => router.push("/account/friends")}
                        className="rounded-full bg-[#FCEFE0] px-2.5 py-1.5"
                      >
                        <Text className="text-xs font-semibold text-[#4A3C32]">
                          Manage
                        </Text>
                      </Pressable>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerClassName="gap-2.5 pr-[18px]"
                      className="-mx-[18px] px-[18px]"
                    >
                      {squads.map((squad) => {
                        const tileColor =
                          SQUAD_COLOR_MAP[squad.color] ?? BR.orange;
                        const memberIds = (squad.memberIds as string[]).join(
                          ",",
                        );
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
                              className="w-[200px]"
                            >
                              {/* Icon tile */}
                              <View
                                className="mb-3 h-11 w-11 items-center justify-center rounded-[14px]"
                                style={{ backgroundColor: tileColor }}
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
                                className="text-[15px]"
                                numberOfLines={1}
                              >
                                {squad.name}
                              </BrText>

                              {/* Members row */}
                              <View className="mt-2.5 flex-row items-center gap-2">
                                <View className="flex-row">
                                  {squad.members.slice(0, 4).map((m, idx) => (
                                    <View
                                      key={m.id}
                                      className={idx ? "-ml-2" : ""}
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
                                <Text className="font-['JetBrainsMono_500Medium'] text-xs text-[#8A7A6E]">
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
                    className="mt-[22px]"
                  >
                    <View className="mb-2.5 flex-row items-baseline justify-between">
                      <BrText variant="h3">Recent runs</BrText>
                    </View>
                    <View className="gap-2.5">
                      {pastOrders.map((order) => {
                        const colorPalette = [
                          BR.orange,
                          BR.lilac,
                          BR.mint,
                          BR.coral,
                        ];
                        const color =
                          colorPalette[
                            (order.name?.charCodeAt(0) || 0) %
                              colorPalette.length
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
                            <BrCard
                              padding={14}
                              className="flex-row items-center gap-3.5"
                            >
                              <View
                                className="h-11 w-11 items-center justify-center rounded-[14px]"
                                style={{ backgroundColor: color }}
                              >
                                <Icon
                                  name="ShoppingBag"
                                  size={20}
                                  color="#fff"
                                />
                              </View>
                              <View className="min-w-0 flex-1">
                                <View className="flex-row items-center gap-1.5">
                                  <BrText
                                    weight="bold"
                                    className="text-sm"
                                    numberOfLines={1}
                                  >
                                    {order.name}
                                  </BrText>
                                  <Text className="text-[11px] text-[#8A7A6E]">
                                    ·
                                  </Text>
                                  <Text className="text-[11px] text-[#8A7A6E]">
                                    {new Date(
                                      order.createdAt,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </Text>
                                </View>
                                <View className="mt-1 flex-row gap-1.5">
                                  <Text className="font-['JetBrainsMono_500Medium'] text-xs text-[#8A7A6E]">
                                    {order.itemsCount} items
                                  </Text>
                                  <Text className="font-['JetBrainsMono_500Medium'] text-xs text-[#8A7A6E]">
                                    ·
                                  </Text>
                                  <Text className="font-['JetBrainsMono_500Medium'] text-xs text-[#8A7A6E]">
                                    $
                                    {(Number(order.userAmount) / 100).toFixed(
                                      2,
                                    )}
                                  </Text>
                                  <Text className="font-['JetBrainsMono_500Medium'] text-xs text-[#8A7A6E]">
                                    ·
                                  </Text>
                                  <Text className="font-['JetBrainsMono_500Medium'] text-xs text-[#8A7A6E]">
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
                                <Text>Again</Text>
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
                    className="items-center px-5 py-10"
                  >
                    <View className="h-24 w-24 items-center justify-center rounded-3xl bg-[#FFE7D4]">
                      <Icon name="Utensils" size={44} color={BR.orange} />
                    </View>
                    <BrText variant="h3" className="mt-[18px]">
                      Welcome to BiteRunr
                    </BrText>
                    <BrText className="mt-1.5 text-center text-sm text-[#8A7A6E]">
                      Start your first group run to see your dashboard here.
                    </BrText>
                  </Animated.View>
                )}
              </>
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
        onSubmit={handleCodeSubmit}
        onClose={() => setShowEnterCode(false)}
      />
    </ErrorBoundary>
  );
}

function HomeSkeleton() {
  return (
    <Skeleton>
      <View className="gap-[22px] pt-4">
        <View className="gap-2">
          <SkeletonBlock width={140} height={14} />
          <SkeletonBlock width={220} height={32} />
        </View>
        <SkeletonBlock width="100%" height={140} rounded="rounded-3xl" />
        <SkeletonBlock width="100%" height={66} rounded="rounded-2xl" />
        <View className="flex-row gap-2.5">
          <SkeletonBlock width="50%" height={92} rounded="rounded-3xl" />
          <SkeletonBlock width="46%" height={92} rounded="rounded-3xl" />
        </View>
        <View className="gap-2.5">
          <SkeletonBlock width={140} height={20} />
          <SkeletonBlock width="100%" height={120} rounded="rounded-3xl" />
        </View>
      </View>
    </Skeleton>
  );
}
