import {
  ScrollView,
  Text,
  View,
  Alert,
  Pressable,
  TouchableOpacity,
  InteractionManager,
} from "react-native";
import { Flow } from "react-native-animated-spinkit";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import ActionSheet, { type ActionSheetRef } from "react-native-actions-sheet";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
  interpolate,
  Extrapolation,
  FadeInUp,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import Icon from "@/components/common/icon";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { QRCodeModal } from "@/components/qr-code-modal";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { primeAiOrderSummaryRequest } from "@/hooks/useAiOrderSummary";
import { BrAvatar, BrButton, BrText } from "@/components/br";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";

type ButtonState = "readyToRun" | "enabled" | "disabled";
type SwipeableRef = { close: () => void };

// Tan placeholder tone for the always-cream loading state (avoids dark
// `bg-muted` slabs sliding in over the cream background).
const SKELETON_TAN = "#EFE1CF";

function UserItemsList({ orderUserId }: { orderUserId: Id<"orderUsers"> }) {
  const items = useQuery(api.orderItems.listForOrderUser, { orderUserId });

  if (items === undefined) {
    return (
      <View className="p-3.5">
        <Flow size={16} color={BR.ink3} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="p-3.5">
        <Text className="text-[13px] italic text-[#8A7A6E]">
          No items added
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-1.5 px-3.5 pb-3.5 pt-2.5">
      {items.map((item, index) => {
        const showLocation =
          index === 0 ||
          items[index - 1].orderLocationId !== item.orderLocationId;
        return (
          <View key={item.id}>
            {showLocation && (
              <Text
                className="mb-1 text-[10px] font-bold uppercase tracking-[0.8px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                {item.locationName}
              </Text>
            )}
            <View className="flex-row items-start justify-between py-[3px]">
              <Text className="flex-1 text-[13px] text-[#1A1410]">
                {item.text}
              </Text>
              {item.priceInCents !== null && (
                <Text
                  className="ml-3 text-[13px] text-[#4A3C32]"
                  style={BR_FONT_STYLE.mono}
                >
                  ${(item.priceInCents / 100).toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RemoveRightAction({
  progress,
  targetUserId,
  memberName,
  swipeable,
  onConfirmRemove,
}: {
  progress: SharedValue<number>;
  targetUserId: Id<"users">;
  memberName: string;
  swipeable: SwipeableRef;
  onConfirmRemove: (
    targetUserId: Id<"users">,
    memberName: string,
    swipeable: SwipeableRef,
  ) => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 1],
          [0.5, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      progress.value,
      [0, 0.5, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <View className="justify-center pl-2.5">
      <ReAnimated.View style={animatedStyle}>
        <TouchableOpacity
          onPress={() => onConfirmRemove(targetUserId, memberName, swipeable)}
          className="h-14 w-14 items-center justify-center rounded-full bg-[#FF4D6D]"
          activeOpacity={0.75}
        >
          <Icon name="UserMinus" size={20} color="white" />
        </TouchableOpacity>
      </ReAnimated.View>
    </View>
  );
}

export default function SpecificOrder() {
  const { orderId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [showQRModal, setShowQRModal] = useState(false);
  const [isSelectingItems, setIsSelectingItems] = useState(false);
  const [_removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isTransferringRunner, setIsTransferringRunner] = useState(false);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const transferRunnerSheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() =>
      setIsTransitionComplete(true),
    );
    return () => task.cancel();
  }, []);

  const toggleExpanded = useCallback((orderUserId: string) => {
    setExpandedUserId((prev) => (prev === orderUserId ? null : orderUserId));
  }, []);

  // Pulse dot animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [pulseOpacity, pulseScale]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const currentUser = useQuery(api.users.getCurrentUser);
  const currentUserId = currentUser?._id;
  const data = useQuery(
    api.orders.get,
    orderId ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  const isPending = data === undefined || !isTransitionComplete;

  const setStatus = useMutation(api.orderUsers.setStatus);
  const updateOrder = useMutation(api.orders.update);
  const transferRunner = useMutation(api.orders.transferRunner);
  const leaveOrder = useMutation(api.orderUsers.leaveOrder);
  const removeFromOrder = useMutation(api.orderUsers.removeFromOrder);
  const generateAiOrderSummary = useAction(
    api.orderItems.generateAiOrderSummary,
  );

  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      data?.order.status === "cancelled" &&
      prevStatusRef.current !== null &&
      prevStatusRef.current !== "cancelled"
    ) {
      router.dismissAll();
    }
    prevStatusRef.current = data?.order.status ?? null;
  }, [data?.order.status]);

  const isCreator = currentUserId === data?.order.creatorId;

  const getButtonState = (): ButtonState => {
    if (!data?.orderUsers || data.orderUsers.length === 0) return "disabled";
    if (data.count === 0) return "disabled";
    const allDone = data.orderUsers.every((u) => u.status === "done");
    const someDone = data.orderUsers.some((u) => u.status === "done");
    if (allDone) return "readyToRun";
    if (someDone) return "enabled";
    return "disabled";
  };

  async function handleSelectItems() {
    if (isSelectingItems) return;
    const orderUser = data?.orderUsers.find((x) => x.userId === currentUserId);
    if (!orderUser) {
      Alert.alert("Error", "Unable to find your order participation.");
      return;
    }
    setIsSelectingItems(true);
    try {
      await setStatus({ orderId: orderId as Id<"orders">, status: "ordering" });
      router.push(
        `/order/items?orderUserId=${orderUser.id}&orderId=${orderId}`,
      );
    } catch (error) {
      if (__DEV__) console.error("Failed to set status:", error);
    } finally {
      setIsSelectingItems(false);
    }
  }

  function handleCancelOrder() {
    Alert.alert("Cancel order", "Are you sure? This cannot be undone.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await updateOrder({
              orderId: orderId as Id<"orders">,
              status: "cancelled",
            });
          } catch (_error) {
            Alert.alert("Error", "Failed to cancel order. Please try again.");
          }
        },
      },
    ]);
  }

  function handleMoreMenu() {
    const options: any[] = [];
    if (!data?.order.paused) {
      options.push({ text: "QR Code", onPress: () => setShowQRModal(true) });
      options.push({
        text: "Transfer runner",
        onPress: () => transferRunnerSheetRef.current?.show(),
      });
    }
    options.push({
      text: "Cancel order",
      style: "destructive",
      onPress: handleCancelOrder,
    });
    options.push({ text: "Close", style: "cancel" });
    Alert.alert("Run options", undefined, options);
  }

  async function handleStartRun() {
    const startRun = async () => {
      try {
        await updateOrder({ orderId: orderId as Id<"orders">, paused: true });
        openOrderSummary("generate");
      } catch {
        Alert.alert("Error", "Failed to start run. Please try again.");
      }
    };
    if (buttonState === "enabled") {
      Alert.alert(
        "Start run anyway?",
        "Not everyone has finished ordering. Starting will lock the order.",
        [
          { text: "No", style: "cancel" },
          { text: "Yes, start", onPress: startRun },
        ],
      );
    } else {
      await startRun();
    }
  }

  function handleLeaveGroup() {
    Alert.alert("Leave group", "Your items will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveOrder({ orderId: orderId as Id<"orders"> });
            router.back();
          } catch {
            Alert.alert("Error", "Failed to leave order. Please try again.");
          }
        },
      },
    ]);
  }

  function openOrderSummary(aiHint: "cached" | "generate") {
    if (aiHint === "generate") {
      void primeAiOrderSummaryRequest(
        generateAiOrderSummary,
        orderId as Id<"orders">,
      );
    }
    router.push(`/order/summary?orderId=${orderId}&aiHint=${aiHint}`);
  }

  function confirmRemoveMember(
    targetUserId: Id<"users">,
    memberName: string,
    swipeable: SwipeableRef,
  ) {
    Alert.alert(
      "Remove member",
      `Remove ${memberName} from this order? Their items will be deleted.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => swipeable.close() },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemovingUserId(targetUserId);
            try {
              await removeFromOrder({
                orderId: orderId as Id<"orders">,
                targetUserId,
              });
            } catch {
              Alert.alert("Error", "Failed to remove member.");
            } finally {
              setRemovingUserId(null);
            }
            swipeable.close();
          },
        },
      ],
    );
  }

  const renderRemoveRightActions =
    (targetUserId: Id<"users">, memberName: string) =>
    (
      progress: SharedValue<number>,
      _drag: SharedValue<number>,
      swipeable: SwipeableRef,
    ) => (
      <RemoveRightAction
        progress={progress}
        targetUserId={targetUserId}
        memberName={memberName}
        swipeable={swipeable}
        onConfirmRemove={confirmRemoveMember}
      />
    );

  // ── Skeleton ──────────────────────────────────────────────────
  if (isPending) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        <View className="flex-row items-center justify-between px-[18px] pb-3 pt-2">
          <View className="h-[38px] w-[38px] rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]" />
          <SkeletonBlock width={120} height={18} color={SKELETON_TAN} />
          <View className="w-[38px]" />
        </View>
        <Skeleton>
          <View className="mt-1 gap-3.5 px-[18px]">
            <SkeletonBlock
              width="100%"
              height={160}
              rounded="rounded-3xl"
              color={SKELETON_TAN}
            />
            <SkeletonBlock
              width="100%"
              height={80}
              rounded="rounded-2xl"
              color={SKELETON_TAN}
            />
            <SkeletonBlock width={100} height={14} color={SKELETON_TAN} />
            {[1, 2, 3].map((i) => (
              <SkeletonBlock
                key={i}
                width="100%"
                height={72}
                rounded="rounded-2xl"
                color={SKELETON_TAN}
              />
            ))}
          </View>
        </Skeleton>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF7EE]">
        <BrText className="text-[#B82340]">Order not found</BrText>
      </View>
    );
  }

  const buttonState = getButtonState();
  const isButtonDisabled = buttonState === "disabled";
  const transferCandidates =
    data.orderUsers.filter((ou) => !ou.isCreator) ?? [];
  const progressPercent =
    data.completionStats && data.completionStats.total > 0
      ? (data.completionStats.done / data.completionStats.total) * 100
      : 0;
  const remainingOrderingCount =
    (data.completionStats?.total ?? 0) - (data.completionStats?.done ?? 0);

  // Show every pickup stop, not just the first. Keep it compact when there are
  // many: "Costco · Chick-fil-A +2".
  const locationNames =
    data.orderLocations
      ?.map((location) => location.name)
      .filter((name): name is string => Boolean(name)) ?? [];
  const locationLabel =
    locationNames.length <= 2
      ? locationNames.join(" · ")
      : `${locationNames.slice(0, 2).join(" · ")} +${locationNames.length - 2}`;

  const dateLabel = new Date(data.order.createdAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isLive = data.order.paused;
  const statusLabel = isLive ? "Live" : "Ordering";

  // ── Main render ───────────────────────────────────────────────
  return (
    <>
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-[18px] pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
          <BrText
            weight="bold"
            className="text-[17px]"
            style={BR_FONT_STYLE.display}
          >
            Run details
          </BrText>
          {isCreator ? (
            <Pressable
              onPress={handleMoreMenu}
              className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
            >
              <Icon name="Ellipsis" size={18} color={BR.ink} />
            </Pressable>
          ) : (
            <View className="w-[38px]" />
          )}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[18px] pb-[200px]"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <ReAnimated.View entering={FadeInUp.duration(300)}>
            <View className="relative overflow-hidden rounded-[22px] bg-[#1A1410] p-[18px]">
              {/* "R" watermark */}
              <Text
                className="absolute -bottom-[34px] -right-6 font-['BricolageGrotesque_800ExtraBold'] text-[200px] italic leading-[200px] tracking-[-12px] text-white/5"
                aria-hidden
              >
                R
              </Text>

              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <BrText
                    className="text-[11px] uppercase tracking-[0.8px] text-white/50"
                    style={BR_FONT_STYLE.mono}
                  >
                    {dateLabel}
                  </BrText>
                  <BrText
                    weight="bold"
                    className="mt-1.5 text-[22px] text-white"
                  >
                    {data.order.name}
                  </BrText>
                  {locationLabel && (
                    <View className="mt-1.5 flex-row items-center gap-[5px]">
                      <Icon
                        name="MapPin"
                        size={12}
                        color="rgba(255,255,255,0.6)"
                      />
                      <Text
                        className="flex-1 text-[13px] text-white/60"
                        numberOfLines={1}
                      >
                        {locationLabel}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Status pill */}
                <View className="flex-row items-center gap-1.5 rounded-full bg-[rgba(255,106,31,0.18)] px-2.5 py-1.5">
                  <View className="relative h-1.5 w-1.5">
                    <View className="absolute h-1.5 w-1.5 rounded-full bg-[#FF6A1F]" />
                    <ReAnimated.View
                      className="absolute h-1.5 w-1.5 rounded-full bg-[#FF6A1F]"
                      style={pulseStyle}
                    />
                  </View>
                  <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#FF6A1F]">
                    {statusLabel}
                  </Text>
                </View>
              </View>

              {/* Stats pills */}
              <View className="mt-3.5 flex-row gap-2.5">
                <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                  <Icon name="Users" size={13} color="rgba(255,255,255,0.7)" />
                  <Text className="text-[13px] text-white/[0.85]">
                    <Text className="font-bold">{data.orderUsers.length}</Text>
                    {data.orderUsers.length === 1 ? " person" : " people"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                  <Icon
                    name="ShoppingBag"
                    size={13}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text className="text-[13px] text-white/[0.85]">
                    <Text className="font-bold">{data.count}</Text>
                    {data.count === 1 ? " item" : " items"}
                  </Text>
                </View>
              </View>
            </View>
          </ReAnimated.View>

          {/* Progress section */}
          {!data.order.paused && (
            <ReAnimated.View
              entering={FadeInUp.duration(300).delay(40)}
              className="mt-[18px]"
            >
              <View className="mb-2.5 flex-row items-baseline justify-between">
                <BrText weight="bold" className="text-base">
                  Order progress
                </BrText>
                <Text
                  className="text-xs text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  {data.completionStats?.done}/{data.completionStats?.total}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-[#FCEFE0]">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: data.completionStats?.allDone
                      ? BR.mint
                      : BR.orange,
                  }}
                />
              </View>
              <Text
                className={`mt-2 text-[13px] ${
                  data.count > 0 && data.completionStats?.allDone
                    ? "text-[#2EBE7B]"
                    : "text-[#8A7A6E]"
                }`}
              >
                {data.count === 0
                  ? "At least one item is needed before the run can start"
                  : data.completionStats?.allDone
                    ? "✨ Everyone's done — ready to roll"
                    : `Waiting on ${remainingOrderingCount} group ${
                        remainingOrderingCount === 1 ? "member" : "members"
                      }`}
              </Text>
            </ReAnimated.View>
          )}

          {/* Group section */}
          <ReAnimated.View
            entering={FadeInUp.duration(300).delay(80)}
            className="mt-[22px]"
          >
            <View className="flex-row items-center justify-between">
              <BrText weight="bold" className="text-base">
                Group
              </BrText>
              {isCreator && !data.order.paused && (
                <Pressable
                  onPress={() => setShowQRModal(true)}
                  className="flex-row items-center gap-1.5 rounded-full bg-[#FFE7D4] px-3 py-2"
                >
                  <Icon name="UserPlus" size={13} color={BR.orangeDeep} />
                  <Text className="text-xs font-bold text-[#E8551A]">
                    Invite
                  </Text>
                </Pressable>
              )}
            </View>

            <View className="mt-3 gap-2.5">
              {data.orderUsers.map((orderUser) => {
                const isCurrentUser = orderUser.userId === currentUserId;
                const isDone = orderUser.status === "done";
                const isExpanded = expandedUserId === orderUser.id;
                const memberName =
                  `${orderUser.user?.firstName ?? ""} ${orderUser.user?.lastName ?? ""}`.trim();

                const cardContent = (
                  <>
                    <View className="flex-row items-center gap-3 p-3.5">
                      {/* Avatar + status dot */}
                      <View className="relative">
                        <BrAvatar
                          name={memberName || "U"}
                          avatarUrl={orderUser.user?.avatarUrl ?? null}
                          size={44}
                        />
                        <View
                          className={`absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] items-center justify-center rounded-full border-[2.5px] border-white ${
                            isDone ? "bg-[#2EBE7B]" : "bg-[#FFC542]"
                          }`}
                        >
                          <Icon
                            name={isDone ? "Check" : "Clock"}
                            size={9}
                            color="#fff"
                            strokeWidth={3.5}
                          />
                        </View>
                      </View>

                      {/* Info */}
                      <View className="min-w-0 flex-1">
                        <View className="flex-row flex-wrap items-center gap-1.5">
                          <Text
                            className={`text-[15px] font-bold ${
                              isCurrentUser
                                ? "text-[#E8551A]"
                                : "text-[#1A1410]"
                            }`}
                          >
                            {memberName || "Unknown"}
                            {isCurrentUser && " (you)"}
                          </Text>
                          {orderUser.isCreator && (
                            <View className="rounded-full bg-[#FFE7D4] px-2 py-0.5">
                              <Text className="text-[11px] font-bold text-[#E8551A]">
                                Host
                              </Text>
                            </View>
                          )}
                        </View>
                        <View className="mt-[3px] flex-row items-center gap-1.5">
                          <Text
                            className={`text-xs font-semibold ${
                              isDone ? "text-[#2EBE7B]" : "text-[#B27500]"
                            }`}
                          >
                            {isDone ? "Done ordering" : "Still ordering…"}
                          </Text>
                          <Text className="text-xs text-[#8A7A6E]">
                            · {orderUser.itemCount}{" "}
                            {orderUser.itemCount === 1 ? "item" : "items"}
                          </Text>
                        </View>
                      </View>

                      {isDone && (
                        <Icon
                          name={isExpanded ? "ChevronUp" : "ChevronDown"}
                          size={18}
                          color={BR.mint}
                        />
                      )}
                    </View>

                    {/* Expanded items */}
                    {isDone && isExpanded && (
                      <View className="border-t border-[rgba(26,20,16,0.08)] bg-black/[0.02]">
                        <UserItemsList
                          orderUserId={orderUser.id as Id<"orderUsers">}
                        />
                      </View>
                    )}
                  </>
                );

                const canSwipeRemove =
                  isCreator && !orderUser.isCreator && !data.order.paused;

                const cardClassName = `overflow-hidden rounded-2xl border ${
                  isCurrentUser
                    ? "border-[rgba(255,106,31,0.25)] bg-[#FFF1E2]"
                    : "border-[rgba(26,20,16,0.08)] bg-white"
                }`;

                const card = isDone ? (
                  <Pressable
                    onPress={() => toggleExpanded(orderUser.id)}
                    className={cardClassName}
                  >
                    {cardContent}
                  </Pressable>
                ) : (
                  <View className={cardClassName}>{cardContent}</View>
                );

                return (
                  <ReAnimated.View
                    key={orderUser.id}
                    exiting={FadeOutRight.duration(300)}
                    layout={LinearTransition.duration(300)}
                  >
                    {canSwipeRemove ? (
                      <Swipeable
                        renderRightActions={renderRemoveRightActions(
                          orderUser.userId as Id<"users">,
                          memberName,
                        )}
                        overshootRight={false}
                      >
                        {card}
                      </Swipeable>
                    ) : (
                      card
                    )}
                  </ReAnimated.View>
                );
              })}
            </View>
          </ReAnimated.View>
        </ScrollView>

        {/* Footer */}
        <View
          className="border-t border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-[18px] pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          {data.order.paused && !isCreator ? (
            <View className="mb-2 items-center">
              <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#FFE7D4]">
                <Icon name="Truck" size={22} color={BR.orange} />
              </View>
              <BrText weight="bold" className="mt-2.5 text-center text-base">
                Your order is being picked up
              </BrText>
              <BrText className="mt-1 text-center text-[13px] text-[#8A7A6E]">
                Sit tight! You'll be notified when it's ready.
              </BrText>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/order/my-settlement?orderId=${orderId}`)
                }
                className="mt-3.5 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4"
                activeOpacity={0.85}
              >
                <Icon name="Receipt" size={18} color="#fff" />
                <Text className="text-base font-bold text-white">
                  View my settlement
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-2.5">
              {data.order.paused && (
                <View className="flex-row items-center gap-2 rounded-[10px] bg-[#FFE7D4] px-3.5 py-2.5">
                  <Icon name="CircleAlert" size={16} color={BR.orangeDeep} />
                  <Text className="flex-1 text-[13px] text-[#E8551A]">
                    The run has started — no more items can be added.
                  </Text>
                </View>
              )}

              {data.order.paused && isCreator ? (
                <TouchableOpacity
                  onPress={() =>
                    openOrderSummary(
                      data.order.hasPausedAiSummary ? "cached" : "generate",
                    )
                  }
                  className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4"
                  activeOpacity={0.85}
                >
                  <Icon name="ClipboardList" size={18} color="#fff" />
                  <Text className="text-base font-bold text-white">
                    View order summary
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleSelectItems}
                  disabled={isSelectingItems}
                  className={`w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 ${
                    isSelectingItems ? "opacity-70" : ""
                  }`}
                  activeOpacity={0.85}
                >
                  {isSelectingItems ? (
                    <Flow size={20} color="#fff" />
                  ) : (
                    <Icon name="Plus" size={18} color="#fff" />
                  )}
                  <Text className="text-base font-bold text-white">
                    Add my items
                  </Text>
                </TouchableOpacity>
              )}

              {!data.order.paused && isCreator && (
                <TouchableOpacity
                  onPress={handleStartRun}
                  disabled={isButtonDisabled}
                  className={`w-full flex-row items-center justify-center gap-2 rounded-2xl border py-4 ${
                    isButtonDisabled
                      ? "border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
                      : buttonState === "readyToRun"
                        ? "border-[#2EBE7B] bg-[#2EBE7B]"
                        : "border-[rgba(46,190,123,0.25)] bg-[#DDF5E8]"
                  }`}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="Play"
                    size={16}
                    color={
                      isButtonDisabled
                        ? BR.ink3
                        : buttonState === "readyToRun"
                          ? "#fff"
                          : BR.mintInk
                    }
                  />
                  <Text
                    className={`text-base font-bold ${
                      isButtonDisabled
                        ? "text-[#8A7A6E]"
                        : buttonState === "readyToRun"
                          ? "text-white"
                          : "text-[#1B6B43]"
                    }`}
                  >
                    {data.count === 0
                      ? "Add items first"
                      : buttonState === "readyToRun"
                        ? "Start the run"
                        : "Start anyway"}
                  </Text>
                </TouchableOpacity>
              )}

              {!isCreator && !data.order.paused && (
                <TouchableOpacity
                  onPress={handleLeaveGroup}
                  className="w-full flex-row items-center justify-center gap-2 rounded-2xl border border-[rgba(26,20,16,0.14)] bg-[#FCEFE0] py-4"
                  activeOpacity={0.85}
                >
                  <Icon name="LogOut" size={16} color={BR.ink} />
                  <Text className="text-base font-bold text-[#1A1410]">
                    Leave group
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* QR Code Modal */}
      {isCreator && data && (
        <QRCodeModal
          visible={showQRModal}
          orderId={orderId as Id<"orders">}
          orderName={data.order.name}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Transfer Runner Sheet */}
      <ActionSheet
        ref={transferRunnerSheetRef}
        gestureEnabled
        indicatorStyle={{ width: 48, height: 5, backgroundColor: BR.line2 }}
        containerStyle={{
          backgroundColor: BR.paper,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 24,
        }}
      >
        <View className="px-[18px] pt-2">
          <BrText weight="bold" className="text-xl">
            Choose a new runner
          </BrText>
          <BrText className="mt-1.5 text-[13px] leading-[19px] text-[#8A7A6E]">
            Anyone in the group can take over. If they don't have Stripe set up
            yet, members can settle in cash.
          </BrText>
        </View>

        <View className="mt-[18px] gap-2.5 px-[18px]">
          {transferCandidates.length === 0 ? (
            <View className="overflow-hidden rounded-2xl border border-[rgba(26,20,16,0.08)]">
              <View className="p-3.5">
                <BrText className="text-[13px] text-[#8A7A6E]">
                  There isn't anyone else in this order yet.
                </BrText>
              </View>
            </View>
          ) : (
            transferCandidates.map((candidate) => {
              const candidateName =
                `${candidate.user?.firstName ?? ""} ${candidate.user?.lastName ?? ""}`.trim() ||
                "Unknown";
              const isEligible = candidate.hasStripePaymentsEnabled;
              return (
                <Pressable
                  key={candidate.id}
                  className="overflow-hidden rounded-2xl border border-[rgba(26,20,16,0.08)] active:opacity-85"
                  disabled={isTransferringRunner}
                  onPress={async () => {
                    transferRunnerSheetRef.current?.hide();
                    setTimeout(() => {
                      Alert.alert(
                        "Transfer runner",
                        isEligible
                          ? `Make ${candidateName} the new runner?`
                          : `${candidateName} doesn't have Stripe set up — members will settle in cash.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Transfer",
                            onPress: async () => {
                              setIsTransferringRunner(true);
                              try {
                                await transferRunner({
                                  orderId: orderId as Id<"orders">,
                                  newCreatorId: candidate.userId as Id<"users">,
                                });
                                Alert.alert(
                                  "Done",
                                  `${candidateName} is now the runner.`,
                                );
                              } catch (error) {
                                Alert.alert(
                                  "Error",
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to transfer.",
                                );
                              } finally {
                                setIsTransferringRunner(false);
                              }
                            },
                          },
                        ],
                      );
                    }, 250);
                  }}
                >
                  <View className="flex-row items-center gap-3 px-3.5 py-3">
                    <BrAvatar name={candidateName} size={40} />
                    <View className="flex-1">
                      <BrText weight="semibold" className="text-[15px]">
                        {candidateName}
                      </BrText>
                      <Text
                        className={`mt-0.5 text-xs ${
                          isEligible ? "text-[#1B6B43]" : "text-[#8A7A6E]"
                        }`}
                      >
                        {isEligible ? "Stripe ready" : "Cash only"}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        isEligible ? "bg-[#DDF5E8]" : "bg-[#FFF1C4]"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          isEligible ? "text-[#1B6B43]" : "text-[#7A4A20]"
                        }`}
                      >
                        {isEligible ? "Ready" : "Cash"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View className="mt-3.5 px-[18px]">
          <BrButton
            label="Close"
            variant="ghost"
            onPress={() => transferRunnerSheetRef.current?.hide()}
          />
        </View>
      </ActionSheet>
    </>
  );
}
