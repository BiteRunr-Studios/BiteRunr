import {
  ScrollView,
  Text,
  View,
  Alert,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  InteractionManager,
} from "react-native";
import { Flow } from "react-native-animated-spinkit";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  SharedValue,
  interpolate,
  Extrapolation,
  FadeInUp,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import Icon from "@/components/common/icon";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QRCodeModal } from "@/components/qr-code-modal";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { primeAiOrderSummaryRequest } from "@/hooks/useAiOrderSummary";
import { BrAvatar, BrButton, BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";

type ButtonState = "readyToRun" | "enabled" | "disabled";

function UserItemsList({ orderUserId }: { orderUserId: Id<"orderUsers"> }) {
  const items = useQuery(api.orderItems.listForOrderUser, { orderUserId });

  if (items === undefined) {
    return (
      <View style={{ padding: 14 }}>
        <Flow size={16} color={BR.ink3} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 13, color: BR.ink3, fontStyle: "italic" }}>No items added</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 6 }}>
      {items.map((item, index) => {
        const showLocation =
          index === 0 || items[index - 1].orderLocationId !== item.orderLocationId;
        return (
          <View key={item.id}>
            {showLocation && (
              <Text style={styles.itemLocation}>{item.locationName}</Text>
            )}
            <View style={styles.itemRow}>
              <Text style={styles.itemText}>{item.text}</Text>
              {item.priceInCents !== null && (
                <Text style={styles.itemPrice}>
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

export default function SpecificOrder() {
  const { orderId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [showQRModal, setShowQRModal] = useState(false);
  const [isSelectingItems, setIsSelectingItems] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isTransferringRunner, setIsTransferringRunner] = useState(false);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const transferRunnerSheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setIsTransitionComplete(true));
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
      withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, false,
    );
  }, []);
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
  const generateAiOrderSummary = useAction(api.orderItems.generateAiOrderSummary);

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
      router.push(`/order/items?orderUserId=${orderUser.id}&orderId=${orderId}`);
    } catch (error) {
      if (__DEV__) console.error("Failed to set status:", error);
    } finally {
      setIsSelectingItems(false);
    }
  }

  function handleCancelOrder() {
    Alert.alert(
      "Cancel order",
      "Are you sure? This cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateOrder({ orderId: orderId as Id<"orders">, status: "cancelled" });
            } catch (error) {
              Alert.alert("Error", "Failed to cancel order. Please try again.");
            }
          },
        },
      ],
    );
  }

  function handleMoreMenu() {
    const options: any[] = [];
    if (!data?.order.paused) {
      options.push({ text: "QR Code", onPress: () => setShowQRModal(true) });
      options.push({ text: "Transfer runner", onPress: () => transferRunnerSheetRef.current?.show() });
    }
    options.push({ text: "Cancel order", style: "destructive", onPress: handleCancelOrder });
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
    Alert.alert(
      "Leave group",
      "Your items will be removed.",
      [
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
      ],
    );
  }

  function openOrderSummary(aiHint: "cached" | "generate") {
    if (aiHint === "generate") {
      void primeAiOrderSummaryRequest(generateAiOrderSummary, orderId as Id<"orders">);
    }
    router.push(`/order/summary?orderId=${orderId}&aiHint=${aiHint}`);
  }

  function confirmRemoveMember(targetUserId: Id<"users">, memberName: string, swipeable: any) {
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
              await removeFromOrder({ orderId: orderId as Id<"orders">, targetUserId });
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

  function RemoveRightAction({
    progress,
    targetUserId,
    memberName,
    swipeable,
  }: {
    progress: SharedValue<number>;
    targetUserId: Id<"users">;
    memberName: string;
    swipeable: any;
  }) {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: interpolate(progress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) }],
      opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.5, 1], Extrapolation.CLAMP),
    }));
    return (
      <View style={{ justifyContent: "center", paddingLeft: 10 }}>
        <ReAnimated.View style={animatedStyle}>
          <TouchableOpacity
            onPress={() => confirmRemoveMember(targetUserId, memberName, swipeable)}
            style={styles.removeBtn}
            activeOpacity={0.75}>
            <Icon name="UserMinus" size={20} color="white" />
          </TouchableOpacity>
        </ReAnimated.View>
      </View>
    );
  }

  const renderRemoveRightActions = useCallback(
    (targetUserId: Id<"users">, memberName: string) =>
      (progress: SharedValue<number>, _drag: SharedValue<number>, swipeable: any) => (
        <RemoveRightAction
          progress={progress}
          targetUserId={targetUserId}
          memberName={memberName}
          swipeable={swipeable}
        />
      ),
    [],
  );

  // ── Skeleton ──────────────────────────────────────────────────
  if (isPending) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BR.paper }}>
        <View style={styles.header}>
          <View style={styles.backBtn} />
          <SkeletonBlock width={120} height={18} />
          <View style={{ width: 38 }} />
        </View>
        <Skeleton>
          <View style={{ paddingHorizontal: 18, gap: 14, marginTop: 4 }}>
            <SkeletonBlock width="100%" height={160} rounded="rounded-3xl" />
            <SkeletonBlock width="100%" height={80} rounded="rounded-2xl" />
            <SkeletonBlock width={100} height={14} />
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} width="100%" height={72} rounded="rounded-2xl" />
            ))}
          </View>
        </Skeleton>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BR.paper }}>
        <BrText style={{ color: BR.coralInk }}>Order not found</BrText>
      </View>
    );
  }

  const buttonState = getButtonState();
  const isButtonDisabled = buttonState === "disabled";
  const transferCandidates = data.orderUsers.filter((ou) => !ou.isCreator) ?? [];
  const progressPercent =
    data.completionStats && data.completionStats.total > 0
      ? (data.completionStats.done / data.completionStats.total) * 100
      : 0;

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
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BR.paper }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
          <BrText weight="bold" style={{ fontSize: 17 }}>Run details</BrText>
          {isCreator ? (
            <Pressable onPress={handleMoreMenu} style={styles.moreBtn}>
              <Icon name="Ellipsis" size={18} color={BR.ink} />
            </Pressable>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 200 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <ReAnimated.View entering={FadeInUp.duration(300)}>
            <View style={styles.heroCard}>
              {/* "R" watermark */}
              <Text style={styles.heroWatermark} aria-hidden>R</Text>

              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <BrText style={styles.heroEyebrow}>{dateLabel}</BrText>
                  <BrText weight="bold" style={styles.heroTitle}>{data.order.name}</BrText>
                  {data.orderLocations?.[0]?.name && (
                    <View style={styles.heroLocationRow}>
                      <Icon name="MapPin" size={12} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.heroLocationText}>{data.orderLocations[0].name}</Text>
                    </View>
                  )}
                </View>

                {/* Status pill */}
                <View style={styles.statusPill}>
                  <View style={{ width: 6, height: 6, position: "relative" }}>
                    <View style={[styles.statusDot, { backgroundColor: BR.orange, position: "absolute" }]} />
                    <ReAnimated.View style={[styles.statusDot, { backgroundColor: BR.orange, position: "absolute" }, pulseStyle]} />
                  </View>
                  <Text style={styles.statusPillText}>{statusLabel}</Text>
                </View>
              </View>

              {/* Stats pills */}
              <View style={styles.heroStats}>
                <View style={styles.heroStatPill}>
                  <Icon name="Users" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroStatText}>
                    <Text style={{ fontWeight: "700" }}>{data.orderUsers.length}</Text>
                    {" people"}
                  </Text>
                </View>
                <View style={styles.heroStatPill}>
                  <Icon name="ShoppingBag" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroStatText}>
                    <Text style={{ fontWeight: "700" }}>{data.count}</Text>
                    {data.count === 1 ? " item" : " items"}
                  </Text>
                </View>
              </View>
            </View>
          </ReAnimated.View>

          {/* Progress section */}
          {!data.order.paused && (
            <ReAnimated.View entering={FadeInUp.duration(300).delay(40)} style={{ marginTop: 18 }}>
              <View style={styles.progressHeader}>
                <BrText weight="bold" style={{ fontSize: 16 }}>Order progress</BrText>
                <Text style={styles.progressFraction}>
                  {data.completionStats?.done}/{data.completionStats?.total}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%` as any,
                      backgroundColor: data.completionStats?.allDone ? BR.mint : BR.orange,
                    },
                  ]}
                />
              </View>
              <Text style={[
                styles.progressStatus,
                { color: data.count > 0 && data.completionStats?.allDone ? BR.mint : BR.ink3 },
              ]}>
                {data.count === 0
                  ? "At least one item is needed before the run can start"
                  : data.completionStats?.allDone
                  ? "✨ Everyone's done — ready to roll"
                  : `Waiting on ${(data.completionStats?.total ?? 0) - (data.completionStats?.done ?? 0)} squad member`}
              </Text>
            </ReAnimated.View>
          )}

          {/* Squad section */}
          <ReAnimated.View entering={FadeInUp.duration(300).delay(80)} style={{ marginTop: 22 }}>
            <View style={styles.squadHeader}>
              <BrText weight="bold" style={{ fontSize: 16 }}>Squad</BrText>
              {isCreator && !data.order.paused && (
                <Pressable onPress={() => setShowQRModal(true)} style={styles.inviteBtn}>
                  <Icon name="UserPlus" size={13} color={BR.orangeDeep} />
                  <Text style={styles.inviteBtnText}>Invite</Text>
                </Pressable>
              )}
            </View>

            <View style={{ gap: 10, marginTop: 12 }}>
              {data.orderUsers.map((orderUser) => {
                const isCurrentUser = orderUser.userId === currentUserId;
                const isDone = orderUser.status === "done";
                const isExpanded = expandedUserId === orderUser.id;
                const memberName = `${orderUser.user?.firstName ?? ""} ${orderUser.user?.lastName ?? ""}`.trim();

                const cardContent = (
                  <>
                    <View style={styles.participantRow}>
                      {/* Avatar + status dot */}
                      <View style={{ position: "relative" }}>
                        <BrAvatar
                          name={memberName || "U"}
                          avatarUrl={orderUser.user?.avatarUrl ?? null}
                          size={44}
                        />
                        <View style={[
                          styles.statusDotBadge,
                          { backgroundColor: isDone ? BR.mint : BR.yolk },
                        ]}>
                          <Icon
                            name={isDone ? "Check" : "Clock"}
                            size={9}
                            color="#fff"
                            strokeWidth={3.5}
                          />
                        </View>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={[styles.participantName, { color: isCurrentUser ? BR.orangeDeep : BR.ink }]}>
                            {memberName || "Unknown"}{isCurrentUser && " (you)"}
                          </Text>
                          {orderUser.isCreator && (
                            <View style={styles.hostPill}>
                              <Text style={styles.hostPillText}>Host</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.participantMeta}>
                          <Text style={{ fontSize: 12, fontWeight: "600", color: isDone ? BR.mint : "#B27500" }}>
                            {isDone ? "Done ordering" : "Still ordering…"}
                          </Text>
                          <Text style={{ fontSize: 12, color: BR.ink3 }}>
                            · {orderUser.itemCount} {orderUser.itemCount === 1 ? "item" : "items"}
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
                      <View style={[styles.expandedItems, { backgroundColor: "rgba(0,0,0,0.02)" }]}>
                        <UserItemsList orderUserId={orderUser.id as Id<"orderUsers">} />
                      </View>
                    )}
                  </>
                );

                const canSwipeRemove = isCreator && !orderUser.isCreator && !data.order.paused;

                const card = isDone ? (
                  <Pressable
                    onPress={() => toggleExpanded(orderUser.id)}
                    style={[
                      styles.participantCard,
                      {
                        backgroundColor: isCurrentUser ? BR.orangeTint : BR.card,
                        borderColor: isCurrentUser ? "rgba(255,106,31,0.25)" : BR.line,
                      },
                    ]}
                  >
                    {cardContent}
                  </Pressable>
                ) : (
                  <View style={[
                    styles.participantCard,
                    {
                      backgroundColor: isCurrentUser ? BR.orangeTint : BR.card,
                      borderColor: isCurrentUser ? "rgba(255,106,31,0.25)" : BR.line,
                    },
                  ]}>
                    {cardContent}
                  </View>
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
                    ) : card}
                  </ReAnimated.View>
                );
              })}
            </View>
          </ReAnimated.View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {data.order.paused && !isCreator ? (
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={styles.truckIcon}>
                <Icon name="Truck" size={22} color={BR.orange} />
              </View>
              <BrText weight="bold" style={{ fontSize: 16, marginTop: 10, textAlign: "center" }}>
                Your order is being picked up
              </BrText>
              <BrText style={{ fontSize: 13, color: BR.ink3, marginTop: 4, textAlign: "center" }}>
                Sit tight! You'll be notified when it's ready.
              </BrText>
              <TouchableOpacity
                onPress={() => router.push(`/order/my-settlement?orderId=${orderId}`)}
                style={[styles.footerBtn, { backgroundColor: BR.orange, marginTop: 14 }]}
                activeOpacity={0.85}
              >
                <Icon name="Receipt" size={18} color="#fff" />
                <Text style={styles.footerBtnText}>View my settlement</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {data.order.paused && (
                <View style={styles.pausedBanner}>
                  <Icon name="CircleAlert" size={16} color={BR.orangeDeep} />
                  <Text style={styles.pausedBannerText}>
                    The run has started — no more items can be added.
                  </Text>
                </View>
              )}

              {data.order.paused && isCreator ? (
                <TouchableOpacity
                  onPress={() => openOrderSummary(data.order.hasPausedAiSummary ? "cached" : "generate")}
                  style={[styles.footerBtn, { backgroundColor: BR.orange }]}
                  activeOpacity={0.85}
                >
                  <Icon name="ClipboardList" size={18} color="#fff" />
                  <Text style={styles.footerBtnText}>View order summary</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleSelectItems}
                  disabled={isSelectingItems}
                  style={[styles.footerBtn, { backgroundColor: BR.orange, opacity: isSelectingItems ? 0.7 : 1 }]}
                  activeOpacity={0.85}
                >
                  {isSelectingItems
                    ? <Flow size={20} color="#fff" />
                    : <Icon name="Plus" size={18} color="#fff" />}
                  <Text style={styles.footerBtnText}>Add my items</Text>
                </TouchableOpacity>
              )}

              {!data.order.paused && isCreator && (
                <TouchableOpacity
                  onPress={handleStartRun}
                  disabled={isButtonDisabled}
                  style={[
                    styles.footerBtn,
                    {
                      backgroundColor: isButtonDisabled
                        ? BR.paper2
                        : buttonState === "readyToRun"
                          ? BR.mint
                          : BR.mintSoft,
                      borderWidth: 1,
                      borderColor: isButtonDisabled ? BR.line : buttonState === "readyToRun" ? BR.mint : "rgba(46,190,123,0.25)",
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="Play"
                    size={16}
                    color={isButtonDisabled ? BR.ink3 : buttonState === "readyToRun" ? "#fff" : BR.mintInk}
                  />
                  <Text style={[
                    styles.footerBtnText,
                    { color: isButtonDisabled ? BR.ink3 : buttonState === "readyToRun" ? "#fff" : BR.mintInk },
                  ]}>
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
                  style={[styles.footerBtn, { backgroundColor: BR.paper2, borderWidth: 1, borderColor: BR.line2 }]}
                  activeOpacity={0.85}
                >
                  <Icon name="LogOut" size={16} color={BR.ink} />
                  <Text style={[styles.footerBtnText, { color: BR.ink }]}>Leave group</Text>
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
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <BrText weight="bold" style={{ fontSize: 20 }}>Choose a new runner</BrText>
          <BrText style={{ fontSize: 13, color: BR.ink3, marginTop: 6, lineHeight: 19 }}>
            Anyone in the group can take over. If they don't have Stripe set up yet, members can settle in cash.
          </BrText>
        </View>

        <View style={{ paddingHorizontal: 18, marginTop: 18, gap: 10 }}>
          {transferCandidates.length === 0 ? (
            <View style={[styles.participantCard, { borderColor: BR.line }]}>
              <View style={{ padding: 14 }}>
                <BrText style={{ fontSize: 13, color: BR.ink3 }}>
                  There isn't anyone else in this order yet.
                </BrText>
              </View>
            </View>
          ) : (
            transferCandidates.map((candidate) => {
              const candidateName =
                `${candidate.user?.firstName ?? ""} ${candidate.user?.lastName ?? ""}`.trim() || "Unknown";
              const isEligible = candidate.hasStripePaymentsEnabled;
              return (
                <Pressable
                  key={candidate.id}
                  style={({ pressed }) => [styles.participantCard, { borderColor: BR.line, opacity: pressed ? 0.85 : 1 }]}
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
                                Alert.alert("Done", `${candidateName} is now the runner.`);
                              } catch (error) {
                                Alert.alert("Error", error instanceof Error ? error.message : "Failed to transfer.");
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
                  <View style={[styles.participantRow, { paddingVertical: 12 }]}>
                    <BrAvatar name={candidateName} size={40} />
                    <View style={{ flex: 1 }}>
                      <BrText weight="semibold" style={{ fontSize: 15 }}>{candidateName}</BrText>
                      <Text style={{ fontSize: 12, color: isEligible ? BR.mintInk : BR.ink3, marginTop: 2 }}>
                        {isEligible ? "Stripe ready" : "Cash only"}
                      </Text>
                    </View>
                    <View style={[styles.eligibilityPill, { backgroundColor: isEligible ? BR.mintSoft : BR.yolkSoft }]}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: isEligible ? BR.mintInk : "#7A4A20" }}>
                        {isEligible ? "Ready" : "Cash"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
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
  moreBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
    alignItems: "center",
    justifyContent: "center",
  },
  // Hero
  heroCard: {
    backgroundColor: BR.ink,
    borderRadius: BR_RADIUS.lg,
    padding: 18,
    overflow: "hidden",
    position: "relative",
  },
  heroWatermark: {
    position: "absolute",
    right: -24,
    bottom: -34,
    fontFamily: BR_FONT.displayExtraBold,
    fontStyle: "italic",
    fontSize: 200,
    lineHeight: 200,
    color: "rgba(255,255,255,0.05)",
    letterSpacing: -12,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
    fontFamily: BR_FONT.mono,
  },
  heroTitle: {
    fontSize: 22,
    color: "#fff",
    marginTop: 6,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  heroLocationText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,106,31,0.18)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: BR.orange,
  },
  heroStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  heroStatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroStatText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  // Progress
  progressHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressFraction: {
    fontSize: 12,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressStatus: {
    fontSize: 13,
    marginTop: 8,
  },
  // Squad
  squadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: BR.orangeDeep,
  },
  participantCard: {
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  statusDotBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  participantName: {
    fontWeight: "700",
    fontSize: 15,
  },
  hostPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
  },
  hostPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: BR.orangeDeep,
  },
  participantMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  expandedItems: {
    borderTopWidth: 1,
    borderTopColor: BR.line,
  },
  // Items
  itemLocation: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: BR.ink3,
    marginBottom: 4,
    fontFamily: BR_FONT.mono,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 3,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: BR.ink,
  },
  itemPrice: {
    marginLeft: 12,
    fontSize: 13,
    color: BR.ink2,
    fontFamily: BR_FONT.mono,
  },
  // Remove action
  removeBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: BR.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  // Footer
  footer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    backgroundColor: BR.paper,
    borderTopWidth: 1,
    borderTopColor: BR.line,
  },
  truckIcon: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: BR_RADIUS.md,
    width: "100%",
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  pausedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BR_RADIUS.sm,
    backgroundColor: BR.orangeSoft,
  },
  pausedBannerText: {
    flex: 1,
    fontSize: 13,
    color: BR.orangeDeep,
  },
  // Transfer sheet
  eligibilityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
