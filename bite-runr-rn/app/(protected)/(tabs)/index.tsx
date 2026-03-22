import React, { useState, useEffect, useCallback } from "react";
import {
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    Pressable,
    InteractionManager,
} from "react-native";
import Animated, {
    FadeInUp,
    FadeInLeft,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useRouter } from "expo-router";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBar } from "@/components/layout/header-bar";
import { AnimatedPressable } from "@/components/common/animated-pressable";
import { Avatar } from "@/components/common/avatar";
import { PaymentSetupSplash } from "@/components/payment-setup-splash";

function FloatingIcon({ children }: { children: React.ReactNode }) {
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-6, {
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                }),
                withTiming(0, {
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                }),
            ),
            -1,
            true,
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export default function HomeTab() {
    const activeOrders = useQuery(api.orders.getActiveOrders);
    const pastOrders = useQuery(api.orders.getPastOrders, { limit: 3 });
    const settlementSummary = useQuery(api.orders.getSettlementSummary);
    const outstandingDebts = useQuery(api.orders.getOutstandingDebts);
    const outstandingPayments = useQuery(api.orders.getOutstandingPayments);
    const frequentGroups = useQuery(api.orders.getFrequentGroups, {});
    const friends = useQuery(api.friends.list);
    const pendingRequests = useQuery(api.friends.pendingRequestCount);
    const currentUser = useQuery(api.users.getCurrentUser);
    const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
    const { colorScheme } = useColorScheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isInitializing, setIsInitializing] = useState(true);
    const [isTransitionComplete, setIsTransitionComplete] = useState(false);
    const [showPaymentSplash, setShowPaymentSplash] = useState(false);
    const [balanceAmount, setBalanceAmount] = useState<number | null>(null);
    const getPayoutBalance = useAction(api.stripeConnect.getPayoutBalance);

    const hasStripe = connectedAccount?.chargesEnabled === true;

    const fetchBalance = useCallback(async () => {
        if (!hasStripe) return;
        try {
            const result = await getPayoutBalance({});
            setBalanceAmount(result.available + result.pending);
        } catch {
            // Silently fail
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
        if (connectedAccount?.chargesEnabled) {
            router.push("/order/create");
        } else {
            setShowPaymentSplash(true);
        }
    };

    const queriesReturned =
        activeOrders !== undefined &&
        pastOrders !== undefined &&
        settlementSummary !== undefined &&
        outstandingDebts !== undefined &&
        outstandingPayments !== undefined &&
        frequentGroups !== undefined &&
        friends !== undefined &&
        pendingRequests !== undefined;

    const hasAnyData =
        (activeOrders?.length ?? 0) > 0 ||
        (pastOrders?.length ?? 0) > 0 ||
        (settlementSummary?.owedToMe ?? 0) > 0 ||
        (settlementSummary?.iOwe ?? 0) > 0 ||
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

    const hasSettlementData =
        settlementSummary &&
        (settlementSummary.owedToMe > 0 || settlementSummary.iOwe > 0);

    const hasSquads =
        frequentGroups && frequentGroups.squads.length > 0;

    const activeOrderCount = activeOrders?.length ?? 0;
    const friendCount = friends?.length ?? 0;
    const pendingRequestCount = pendingRequests ?? 0;

    return (
        <ErrorBoundary>
            <View
                style={{ paddingTop: insets.top }}
                className="flex-1 bg-background">
                <HeaderBar />
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingBottom: 50 + insets.bottom,
                    }}
                    showsVerticalScrollIndicator={false}>
                    {isLoading && <HomeSkeleton />}

                    {!isLoading && (
                        <View className="px-4 pb-8">
                            {/* New Order Row — matches groups page position */}
                            <Animated.View
                                entering={FadeInUp.duration(400)}
                                className="flex-row items-center justify-between mt-2 mb-4">
                                {currentUser?.firstName && (
                                    <View>
                                        <Text
                                            className="text-2xl font-bold"
                                            style={{
                                                color: "#f97316",
                                            }}>
                                            {getGreeting()}
                                        </Text>
                                        <Text className="mt-1 text-sm text-muted-foreground">
                                            {new Date().toLocaleDateString(
                                                "en-US",
                                                {
                                                    weekday: "long",
                                                    month: "long",
                                                    day: "numeric",
                                                },
                                            )}
                                        </Text>
                                    </View>
                                )}
                                <Pressable
                                    onPress={handleCreateOrder}
                                    className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-primary active:opacity-80">
                                    <Icon
                                        name="Plus"
                                        size={16}
                                        color="white"
                                    />
                                    <Text className="text-sm font-semibold text-white">
                                        New Order
                                    </Text>
                                </Pressable>
                            </Animated.View>

                            <View className="gap-6">

                            {/* Summary Card */}
                            <Animated.View
                                entering={FadeInUp.duration(400)}>
                                <View className="flex-row rounded-2xl border border-muted bg-card overflow-hidden">
                                    <AnimatedPressable
                                        className="flex-1"
                                        onPress={() =>
                                            router.push(
                                                "/groups?filter=active",
                                            )
                                        }>
                                        <View className="items-center py-4 gap-1.5">
                                            <View className="items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                                                <Icon
                                                    name="Zap"
                                                    size={18}
                                                    color={
                                                        NAV_THEME[
                                                            colorScheme
                                                        ].primary
                                                    }
                                                />
                                            </View>
                                            <Text className="text-2xl font-bold text-foreground">
                                                {activeOrderCount}
                                            </Text>
                                            <Text className="text-xs text-muted-foreground">
                                                Orders Active
                                            </Text>
                                        </View>
                                    </AnimatedPressable>

                                    <View className="my-3 border-l border-muted" />

                                    {hasStripe && (
                                        <>
                                            <AnimatedPressable
                                                className="flex-1"
                                                onPress={() =>
                                                    router.push(
                                                        "/account/payments",
                                                    )
                                                }>
                                                <View className="items-center py-4 gap-1.5">
                                                    <View className="items-center justify-center w-10 h-10 rounded-full bg-green-500/10">
                                                        <Icon
                                                            name="Wallet"
                                                            size={18}
                                                            color="#22c55e"
                                                        />
                                                    </View>
                                                    {balanceAmount !== null ? (
                                                        <Animated.Text
                                                            entering={FadeInUp.duration(300).easing(Easing.out(Easing.ease))}
                                                            className={`font-bold text-green-600 ${balanceAmount >= 100000 ? "text-base" : balanceAmount >= 10000 ? "text-lg" : "text-2xl"}`}
                                                            numberOfLines={1}
                                                            adjustsFontSizeToFit>
                                                            $
                                                            {(
                                                                balanceAmount /
                                                                100
                                                            ).toFixed(2)}
                                                        </Animated.Text>
                                                    ) : (
                                                        <Skeleton>
                                                            <SkeletonBlock width={50} height={24} rounded="rounded-md" />
                                                        </Skeleton>
                                                    )}
                                                    <Text className="text-xs text-muted-foreground">
                                                        Balance
                                                    </Text>
                                                </View>
                                            </AnimatedPressable>

                                            <View className="my-3 border-l border-muted" />
                                        </>
                                    )}

                                    <AnimatedPressable
                                        className="flex-1"
                                        onPress={() =>
                                            router.push("/account/friends")
                                        }>
                                        <View className="items-center py-4 gap-1.5">
                                            <View className="items-center justify-center w-10 h-10 rounded-full bg-yellow-500/10">
                                                <Icon
                                                    name="UserPlus"
                                                    size={18}
                                                    color="#eab308"
                                                />
                                                {pendingRequestCount > 0 && (
                                                    <View className="absolute -top-1 -right-1 items-center justify-center px-1 min-w-[16px] h-4 rounded-full bg-red-500">
                                                        <Text className="text-[9px] font-bold text-white">
                                                            {pendingRequestCount}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text className="text-2xl font-bold text-foreground">
                                                {pendingRequestCount}
                                            </Text>
                                            <Text className="text-xs text-muted-foreground">
                                                Requests
                                            </Text>
                                        </View>
                                    </AnimatedPressable>

                                </View>
                            </Animated.View>

                            {/* Outstanding Debts Section */}
                            {outstandingDebts && outstandingDebts.length > 0 && (
                                <Animated.View
                                    entering={FadeInUp.duration(400).delay(
                                        50,
                                    )}>
                                    <View className="flex-row gap-2 items-center mb-3">
                                        <Icon
                                            name="CircleDollarSign"
                                            size={20}
                                            color="#f97316"
                                        />
                                        <Text className="text-lg font-semibold text-foreground">
                                            Awaiting Payment
                                        </Text>
                                        <View className="px-2 py-0.5 rounded-full bg-orange-500/10">
                                            <Text className="text-xs font-medium text-orange-500">
                                                {outstandingDebts.length}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="gap-2">
                                        {outstandingDebts.map((debt) => (
                                            <AnimatedPressable
                                                key={`${debt.orderId}-${debt.userId}`}
                                                onPress={() =>
                                                    router.push(
                                                        `/order/${debt.orderId}`,
                                                    )
                                                }>
                                                <View className="flex-row items-center p-3 rounded-xl border border-muted bg-card">
                                                    <Avatar
                                                        name={`${debt.firstName} ${debt.lastName}`}
                                                        avatarUrl={
                                                            debt.avatarUrl
                                                        }
                                                        size={40}
                                                    />
                                                    <View className="flex-1 ml-3">
                                                        <Text className="text-sm font-semibold text-foreground">
                                                            {debt.firstName}{" "}
                                                            {debt.lastName}
                                                        </Text>
                                                        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                                                            {debt.orderName}
                                                        </Text>
                                                    </View>
                                                    <Text className="text-base font-bold text-orange-500">
                                                        $
                                                        {(
                                                            debt.amountOwed /
                                                            100
                                                        ).toFixed(2)}
                                                    </Text>
                                                </View>
                                            </AnimatedPressable>
                                        ))}
                                    </View>
                                </Animated.View>
                            )}

                            {outstandingPayments &&
                                outstandingPayments.length > 0 && (
                                    <Animated.View
                                        entering={FadeInUp.duration(400).delay(
                                            100,
                                        )}>
                                        <View className="flex-row gap-2 items-center mb-3">
                                            <Icon
                                                name="CreditCard"
                                                size={20}
                                                color="#ef4444"
                                            />
                                            <Text className="text-lg font-semibold text-foreground">
                                                Payments Due
                                            </Text>
                                            <View className="px-2 py-0.5 rounded-full bg-red-500/10">
                                                <Text className="text-xs font-medium text-red-500">
                                                    {
                                                        outstandingPayments.length
                                                    }
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="gap-2">
                                            {outstandingPayments.map(
                                                (payment) => (
                                                    <AnimatedPressable
                                                        key={`${payment.orderId}-${payment.creatorId}`}
                                                        onPress={() =>
                                                            router.push(
                                                                `/order/my-settlement?orderId=${payment.orderId}`,
                                                            )
                                                        }>
                                                        <View className="flex-row items-center p-3 rounded-xl border border-muted bg-card">
                                                            <Avatar
                                                                name={`${payment.creatorFirstName} ${payment.creatorLastName}`}
                                                                avatarUrl={
                                                                    payment.creatorAvatarUrl
                                                                }
                                                                size={40}
                                                            />
                                                            <View className="flex-1 ml-3">
                                                                <Text className="text-sm font-semibold text-foreground">
                                                                    {
                                                                        payment.creatorFirstName
                                                                    }{" "}
                                                                    {
                                                                        payment.creatorLastName
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    className="text-xs text-muted-foreground"
                                                                    numberOfLines={
                                                                        1
                                                                    }>
                                                                    {
                                                                        payment.orderName
                                                                    }
                                                                </Text>
                                                            </View>
                                                            <Text className="text-base font-bold text-red-500">
                                                                $
                                                                {(
                                                                    payment.amountOwed /
                                                                    100
                                                                ).toFixed(2)}
                                                            </Text>
                                                        </View>
                                                    </AnimatedPressable>
                                                ),
                                            )}
                                        </View>
                                    </Animated.View>
                                )}

                            {/* Your Squads Section */}
                            {hasAnyData && <Animated.View
                                entering={FadeInUp.duration(400).delay(
                                    150,
                                )}>
                                <View className="flex-row gap-2 items-center mb-3">
                                    <Icon
                                        name="Users"
                                        size={20}
                                        color="#3b82f6"
                                    />
                                    <Text className="text-lg font-semibold text-foreground">
                                        Your Squads
                                    </Text>
                                </View>

                            {hasSquads ? (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        className="px-4 -mx-4">
                                        <View className="flex-row gap-3">
                                            {frequentGroups.squads.map(
                                                (squad) => (
                                                    <AnimatedPressable
                                                        key={squad.id}
                                                        style={{ width: 200 }}
                                                        onPress={() =>
                                                            router.push(
                                                                `/order/create?reorderFriendIds=${squad.memberIds}`,
                                                            )
                                                        }>
                                                        <View className="p-4 rounded-2xl border border-muted bg-card">
                                                            {/* Stacked Avatars */}
                                                            <View className="flex-row items-center mb-3">
                                                                {squad.members
                                                                    .slice(
                                                                        0,
                                                                        squad
                                                                            .members
                                                                            .length >
                                                                            4
                                                                            ? 3
                                                                            : 4,
                                                                    )
                                                                    .map(
                                                                        (
                                                                            member,
                                                                            idx,
                                                                        ) => (
                                                                            <View
                                                                                key={
                                                                                    member.id
                                                                                }
                                                                                style={{
                                                                                    marginLeft:
                                                                                        idx >
                                                                                        0
                                                                                            ? -10
                                                                                            : 0,
                                                                                    zIndex:
                                                                                        squad
                                                                                            .members
                                                                                            .length -
                                                                                        idx,
                                                                                }}
                                                                                className="border-2 rounded-full border-card">
                                                                                <Avatar
                                                                                    name={`${member.firstName || ""} ${member.lastName || ""}`}
                                                                                    avatarUrl={
                                                                                        member.avatarUrl
                                                                                    }
                                                                                    size={
                                                                                        36
                                                                                    }
                                                                                />
                                                                            </View>
                                                                        ),
                                                                    )}
                                                                {squad.members
                                                                    .length >
                                                                    4 && (
                                                                    <View
                                                                        style={{
                                                                            marginLeft: -10,
                                                                            width: 36,
                                                                            height: 36,
                                                                            zIndex: 0,
                                                                        }}
                                                                        className="flex items-center justify-center border-2 rounded-full border-card bg-primary">
                                                                        <Text className="text-xs font-semibold text-white">
                                                                            +
                                                                            {squad
                                                                                .members
                                                                                .length -
                                                                                3}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>

                                                            {/* Member Names */}
                                                            <Text
                                                                className="text-sm font-medium text-foreground"
                                                                numberOfLines={
                                                                    1
                                                                }>
                                                                {squad.members
                                                                    .map(
                                                                        (m) =>
                                                                            m.firstName,
                                                                    )
                                                                    .join(", ")}
                                                            </Text>

                                                            {/* Order Count */}
                                                            <Text className="text-xs text-muted-foreground mt-1">
                                                                {
                                                                    squad.orderCount
                                                                }{" "}
                                                                orders together
                                                            </Text>

                                                            {/* Location */}
                                                            {squad.locationNames
                                                                .length >
                                                                0 && (
                                                                <View className="flex-row items-center gap-1 mt-2">
                                                                    <Icon
                                                                        name="MapPin"
                                                                        size={
                                                                            12
                                                                        }
                                                                        color="#ef4444"
                                                                    />
                                                                    <Text
                                                                        className="text-[11px] text-muted-foreground"
                                                                        numberOfLines={
                                                                            1
                                                                        }>
                                                                        {squad.locationNames.join(
                                                                            ", ",
                                                                        )}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </AnimatedPressable>
                                                ),
                                            )}
                                        </View>
                                    </ScrollView>
                            ) : (
                                    <View className="items-center p-6 rounded-2xl border border-dashed border-muted bg-card">
                                        <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-blue-500/10">
                                            <Icon
                                                name="Users"
                                                size={24}
                                                color="#3b82f6"
                                            />
                                        </View>
                                        <Text className="text-sm font-medium text-foreground text-center">
                                            No squads yet
                                        </Text>
                                        <Text className="mt-1 text-xs text-center text-muted-foreground">
                                            Order with the same friends to build your squads
                                        </Text>
                                    </View>
                            )}
                                </Animated.View>}

                            {/* Recent Orders Section */}
                            {hasAnyData && <Animated.View
                                    entering={FadeInUp.duration(400).delay(
                                        200,
                                    )}>
                                    <View className="flex-row gap-2 items-center mb-3">
                                        <Icon
                                            name="History"
                                            size={20}
                                            color="#3b82f6"
                                        />
                                        <Text className="text-lg font-semibold text-foreground">
                                            Recent Orders
                                        </Text>
                                    </View>

                            {pastOrders.length > 0 ? (
                                    <View className="gap-3">
                                        {pastOrders.map((order) => (
                                            <AnimatedPressable
                                                key={order.id}
                                                onPress={() =>
                                                    router.push(
                                                        `/order/completed-order?orderId=${order.id}`,
                                                    )
                                                }>
                                                <View className="p-4 rounded-2xl border border-muted bg-card">
                                                    <View>
                                                        <Text className="text-sm text-muted-foreground">
                                                            {new Date(
                                                                order.createdAt,
                                                            ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    weekday:
                                                                        "short",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                },
                                                            )}
                                                        </Text>
                                                        <Text className="mt-1 text-lg font-semibold text-foreground">
                                                            {order.name}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-row flex-wrap gap-3 items-center pt-3 mt-3 border-t border-muted">
                                                        <View className="flex-row items-center gap-1.5">
                                                            <Icon
                                                                name="ShoppingBag"
                                                                size={14}
                                                                color="#f97316"
                                                            />
                                                            <Text className="text-sm text-muted-foreground">
                                                                {
                                                                    order.itemsCount
                                                                }{" "}
                                                                items
                                                            </Text>
                                                        </View>
                                                        {order.userAmount >
                                                            0 && (
                                                            <View className="flex-row items-center gap-1.5">
                                                                <Icon
                                                                    name="DollarSign"
                                                                    size={14}
                                                                    color="#22c55e"
                                                                />
                                                                <Text className="text-sm text-muted-foreground">
                                                                    $
                                                                    {(
                                                                        Number(
                                                                            order.userAmount,
                                                                        ) / 100
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        <View className="flex-row items-center gap-1.5">
                                                            <Icon
                                                                name="Users"
                                                                size={14}
                                                                color="#3b82f6"
                                                            />
                                                            <Text className="text-sm text-muted-foreground">
                                                                {
                                                                    order
                                                                        .orderUsers
                                                                        .length
                                                                }{" "}
                                                                people
                                                            </Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                const locationNamesParam =
                                                                    encodeURIComponent(
                                                                        JSON.stringify(
                                                                            order.orderLocations?.map(
                                                                                (
                                                                                    ol,
                                                                                ) =>
                                                                                    ol.name,
                                                                            ) ??
                                                                                [],
                                                                        ),
                                                                    );
                                                                const friendIds =
                                                                    order.orderUsers
                                                                        .filter(
                                                                            (
                                                                                ou,
                                                                            ) =>
                                                                                ou.userId !==
                                                                                currentUser?._id,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                ou,
                                                                            ) =>
                                                                                ou.userId,
                                                                        )
                                                                        .join(
                                                                            ",",
                                                                        );
                                                                router.push(
                                                                    `/order/create?reorderName=${encodeURIComponent(order.name)}&reorderLocationNames=${locationNamesParam}&reorderFriendIds=${friendIds}`,
                                                                );
                                                            }}
                                                            className="flex-row items-center gap-1 px-3 py-1.5 ml-auto rounded-full bg-primary/10">
                                                            <Icon
                                                                name="RotateCcw"
                                                                size={12}
                                                                color={
                                                                    NAV_THEME[
                                                                        colorScheme
                                                                    ].primary
                                                                }
                                                            />
                                                            <Text className="text-xs font-semibold text-primary">
                                                                Order Again
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </AnimatedPressable>
                                        ))}
                                    </View>
                            ) : (
                                    <View className="items-center p-6 rounded-2xl border border-dashed border-muted bg-card">
                                        <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-blue-500/10">
                                            <Icon
                                                name="History"
                                                size={24}
                                                color="#3b82f6"
                                            />
                                        </View>
                                        <Text className="text-sm font-medium text-foreground text-center">
                                            No recent orders
                                        </Text>
                                        <Text className="mt-1 text-xs text-center text-muted-foreground">
                                            Complete orders to see your history here
                                        </Text>
                                    </View>
                            )}
                                </Animated.View>}

                            {/* Empty state when nothing exists */}
                            {!hasSettlementData &&
                                !hasSquads &&
                                activeOrderCount === 0 &&
                                friendCount === 0 &&
                                pastOrders.length === 0 && (
                                    <Animated.View
                                        entering={FadeInUp.duration(
                                            600,
                                        ).springify()}
                                        className="items-center p-8 mt-10">
                                        <FloatingIcon>
                                            <View className="justify-center items-center mb-6 w-24 h-24 rounded-2xl bg-primary/10">
                                                <Icon
                                                    name="Utensils"
                                                    size={44}
                                                    color={
                                                        NAV_THEME[colorScheme]
                                                            .primary
                                                    }
                                                />
                                            </View>
                                        </FloatingIcon>
                                        <Text className="text-xl font-semibold text-foreground">
                                            Welcome to BiteRunr
                                        </Text>
                                        <Text className="mt-2 text-base text-center text-muted-foreground">
                                            Start your first group order to see
                                            your dashboard here
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleCreateOrder}
                                            className="flex-row gap-2 items-center px-6 py-3 mt-6 rounded-full bg-primary">
                                            <Icon
                                                name="Plus"
                                                size={20}
                                                color="white"
                                            />
                                            <Text className="text-base font-semibold text-white">
                                                Create Your First Order
                                            </Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>

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
        </ErrorBoundary>
    );
}

function HomeSkeleton() {
    return (
        <Skeleton>
            <View className="gap-6 px-4 pb-8 mt-4">
                {/* Greeting Skeleton */}
                <View className="flex-row justify-between items-center">
                    <View>
                        <SkeletonBlock width={160} height={28} className="mb-2" />
                        <SkeletonBlock width={180} height={16} />
                    </View>
                    <SkeletonBlock
                        width={110}
                        height={36}
                        rounded="rounded-full"
                    />
                </View>

                {/* Summary Card Skeleton */}
                <View className="flex-row rounded-2xl border border-muted bg-card overflow-hidden">
                    {[1, 2, 3].map((i) => (
                        <React.Fragment key={i}>
                            {i > 1 && (
                                <View className="my-3 border-l border-muted" />
                            )}
                            <View className="flex-1 items-center py-4 gap-1.5">
                                <SkeletonBlock
                                    width={40}
                                    height={40}
                                    rounded="rounded-full"
                                />
                                <SkeletonBlock
                                    width={30}
                                    height={28}
                                />
                                <SkeletonBlock width={45} height={14} />
                            </View>
                        </React.Fragment>
                    ))}
                </View>

                {/* Settlement Skeleton */}
                <View>
                    <View className="flex-row gap-2 items-center mb-3">
                        <SkeletonBlock width={20} height={20} />
                        <SkeletonBlock width={100} height={22} />
                    </View>
                    <View className="p-4 rounded-2xl border border-muted bg-card">
                        <View className="flex-row gap-3">
                            <View className="flex-1 p-3 rounded-xl">
                                <SkeletonBlock
                                    width={70}
                                    height={14}
                                    className="mb-2"
                                />
                                <SkeletonBlock width={90} height={24} />
                            </View>
                            <View className="flex-1 p-3 rounded-xl">
                                <SkeletonBlock
                                    width={55}
                                    height={14}
                                    className="mb-2"
                                />
                                <SkeletonBlock width={70} height={24} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Squads Skeleton */}
                <View>
                    <View className="flex-row gap-2 items-center mb-3">
                        <SkeletonBlock width={20} height={20} />
                        <SkeletonBlock width={100} height={22} />
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        scrollEnabled={false}
                        className="px-4 -mx-4">
                        <View className="flex-row gap-3">
                            {[1, 2].map((i) => (
                                <View
                                    key={i}
                                    style={{ width: 200 }}
                                    className="p-4 rounded-2xl border border-muted bg-card">
                                    <View className="flex-row mb-3">
                                        {[1, 2, 3].map((j) => (
                                            <SkeletonBlock
                                                key={j}
                                                width={36}
                                                height={36}
                                                rounded="rounded-full"
                                                style={{
                                                    marginLeft:
                                                        j > 1 ? -10 : 0,
                                                }}
                                            />
                                        ))}
                                    </View>
                                    <SkeletonBlock
                                        width={140}
                                        height={16}
                                        className="mb-1"
                                    />
                                    <SkeletonBlock width={100} height={12} />
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Recent Orders Skeleton */}
                <View>
                    <View className="flex-row gap-2 items-center mb-3">
                        <SkeletonBlock width={20} height={20} />
                        <SkeletonBlock width={120} height={22} />
                    </View>
                    <View className="gap-3">
                        {[1, 2].map((i) => (
                            <View
                                key={i}
                                className="p-4 rounded-2xl border border-muted bg-card">
                                <View>
                                    <SkeletonBlock
                                        width={100}
                                        height={16}
                                        className="mb-2"
                                    />
                                    <SkeletonBlock width={180} height={22} />
                                </View>
                                <View className="flex-row gap-3 items-center pt-3 mt-3 border-t border-muted">
                                    <SkeletonBlock width={60} height={16} />
                                    <SkeletonBlock width={50} height={16} />
                                    <SkeletonBlock width={70} height={16} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </Skeleton>
    );
}
