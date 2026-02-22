import React, { useState, useEffect, useCallback } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    useWindowDimensions,
} from "react-native";
import Animated, {
    FadeInUp,
    FadeInLeft,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
} from "react-native-reanimated";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OrderCard, OrderCardSkeleton } from "@/components/order-card";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useRouter } from "expo-router";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBar } from "@/components/layout/header-bar";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedPressable({
    children,
    style,
    ...props
}: React.ComponentProps<typeof Pressable>) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const onPressIn = useCallback(() => {
        scale.value = withTiming(0.97, { duration: 150 });
    }, []);
    const onPressOut = useCallback(() => {
        scale.value = withTiming(1, { duration: 200 });
    }, []);

    return (
        <ReanimatedPressable
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={[animatedStyle, style]}
            {...props}>
            {children}
        </ReanimatedPressable>
    );
}

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

const CARD_PADDING = 16;
const CARD_GAP = 16;

export default function HomeTab() {
    const activeOrders = useQuery(api.orders.getActiveOrders);
    const pastOrders = useQuery(api.orders.getPastOrders, { limit: 3 });
    const frequentItems = useQuery(api.orders.getFrequentItems, { limit: 6 });
    const currentUser = useQuery(api.users.getCurrentUser);
    const { colorScheme } = useColorScheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const cardWidth = screenWidth - CARD_PADDING * 2;
    // Track initial data load to prevent flash of empty state
    const [isInitializing, setIsInitializing] = useState(true);

    const queriesReturned =
        activeOrders !== undefined &&
        pastOrders !== undefined &&
        frequentItems !== undefined;

    const hasAnyData =
        (activeOrders?.length ?? 0) > 0 ||
        (pastOrders?.length ?? 0) > 0 ||
        (frequentItems?.length ?? 0) > 0;

    // Show content immediately if we have data, otherwise wait for data to settle
    useEffect(() => {
        if (!queriesReturned) return;

        // If we have data, show it immediately
        if (hasAnyData) {
            setIsInitializing(false);
            return;
        }

        // If queries returned but empty, wait longer before showing empty state
        // This handles the case where Convex returns empty before auth syncs
        const timer = setTimeout(() => setIsInitializing(false), 1500);
        return () => clearTimeout(timer);
    }, [queriesReturned, hasAnyData]);

    const isLoading = !queriesReturned || isInitializing;

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
                        <View className="gap-8 px-4 pb-8 mt-4">
                            {/* Greeting Header */}
                            {currentUser?.firstName && (
                                <Animated.View
                                    entering={FadeInLeft.duration(500)}>
                                    <View className="flex-row justify-between items-center">
                                        <View>
                                            <Text className="text-2xl font-bold">
                                                <Text
                                                    style={{
                                                        color: "#f97316",
                                                    }}>
                                                    {getGreeting()},
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: "#ea580c",
                                                    }}>
                                                    {" "}
                                                    {currentUser.firstName}
                                                </Text>
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
                                        <TouchableOpacity
                                            onPress={() =>
                                                router.push("/order/create")
                                            }
                                            className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-primary">
                                            <Icon
                                                name="Plus"
                                                size={16}
                                                color="white"
                                            />
                                            <Text className="text-sm font-semibold text-white">
                                                New Order
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>
                            )}

                            {/* Active Orders Section - only show if there are active orders OR if there's other data */}
                            {(activeOrders.length > 0 ||
                                pastOrders.length > 0 ||
                                frequentItems.length > 0) && (
                                <Animated.View
                                    entering={FadeInUp.duration(500)}>
                                    <View className="flex-row justify-between items-center mb-4">
                                        <View className="flex-row gap-2 items-center">
                                            <Icon
                                                name="Zap"
                                                size={20}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .primary
                                                }
                                            />
                                            <Text className="text-lg font-semibold text-foreground">
                                                Active Orders
                                            </Text>
                                        </View>
                                        {activeOrders.length > 0 && (
                                            <View className="px-3 py-1.5 rounded-full bg-primary/10">
                                                <Text className="text-sm font-semibold text-primary">
                                                    {activeOrders.length} active
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {activeOrders.length === 0 ? (
                                        <View className="items-center p-10 rounded-2xl border border-dashed border-muted bg-card">
                                            <FloatingIcon>
                                                <View className="justify-center items-center mb-5 w-20 h-20 rounded-2xl bg-primary/10">
                                                    <Icon
                                                        name="ShoppingBag"
                                                        size={36}
                                                        color={
                                                            NAV_THEME[
                                                                colorScheme
                                                            ].primary
                                                        }
                                                    />
                                                </View>
                                            </FloatingIcon>
                                            <Text className="text-base font-medium text-foreground">
                                                No active orders
                                            </Text>
                                            <Text className="mt-2 text-sm text-center text-muted-foreground">
                                                Start a new order to get your
                                                group together
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    router.push("/order/create")
                                                }
                                                className="flex-row items-center gap-2 px-5 py-2.5 mt-5 rounded-full bg-primary">
                                                <Icon
                                                    name="Plus"
                                                    size={18}
                                                    color="white"
                                                />
                                                <Text className="font-semibold text-white">
                                                    New Order
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={
                                                false
                                            }
                                            pagingEnabled={false}
                                            decelerationRate="fast"
                                            snapToInterval={
                                                cardWidth + CARD_GAP
                                            }
                                            snapToAlignment="start"
                                            className="-mx-4"
                                            contentContainerStyle={{
                                                paddingHorizontal: CARD_PADDING,
                                                alignItems: "stretch",
                                            }}>
                                            {activeOrders.map(
                                                (order, index) => (
                                                    <AnimatedPressable
                                                        key={order.id}
                                                        onPress={() =>
                                                            router.push(
                                                                `/order/${order.id}`,
                                                            )
                                                        }
                                                        style={{
                                                            width: cardWidth,
                                                            marginRight:
                                                                index <
                                                                activeOrders.length -
                                                                    1
                                                                    ? CARD_GAP
                                                                    : 0,
                                                        }}>
                                                        <OrderCard
                                                            id={order.id}
                                                            name={order.name}
                                                            status={
                                                                order.status
                                                            }
                                                            paused={
                                                                order.paused
                                                            }
                                                            createdAt={
                                                                order.createdAt
                                                            }
                                                            orderUsers={
                                                                order.orderUsers
                                                            }
                                                        />
                                                    </AnimatedPressable>
                                                ),
                                            )}
                                        </ScrollView>
                                    )}
                                </Animated.View>
                            )}

                            {/* Frequently Ordered Items Section */}
                            {frequentItems.length > 0 && (
                                <Animated.View
                                    entering={FadeInUp.duration(500).delay(
                                        150,
                                    )}>
                                    <View className="flex-row gap-2 items-center mb-4">
                                        <Icon
                                            name="Star"
                                            size={20}
                                            color="#eab308"
                                        />
                                        <Text className="text-lg font-semibold text-foreground">
                                            Your Favorites
                                        </Text>
                                    </View>

                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        className="px-4 -mx-4">
                                        <View className="flex-row gap-3">
                                            {frequentItems.map((item) => (
                                                <AnimatedPressable
                                                    key={item.id}
                                                    style={{ width: 176 }}>
                                                    <View className="p-4 rounded-2xl border border-muted bg-card">
                                                        <Text
                                                            className="text-base font-semibold text-foreground"
                                                            numberOfLines={2}>
                                                            {item.name}
                                                        </Text>
                                                        <View className="flex-row gap-1 items-center mt-2">
                                                            <Icon
                                                                name="MapPin"
                                                                size={12}
                                                                color="#ef4444"
                                                            />
                                                            <Text
                                                                className="text-xs text-muted-foreground"
                                                                numberOfLines={
                                                                    1
                                                                }>
                                                                {
                                                                    item.locationName
                                                                }
                                                            </Text>
                                                        </View>
                                                        <Text className="mt-2 text-xs text-muted-foreground">
                                                            Ordered{" "}
                                                            {item.totalOrdered}{" "}
                                                            time
                                                            {item.totalOrdered !==
                                                            1
                                                                ? "s"
                                                                : ""}
                                                        </Text>
                                                    </View>
                                                </AnimatedPressable>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </Animated.View>
                            )}

                            {/* Past Orders Section */}
                            {pastOrders.length > 0 && (
                                <Animated.View
                                    entering={FadeInUp.duration(500).delay(
                                        300,
                                    )}>
                                    <View className="flex-row gap-2 items-center mb-4">
                                        <Icon
                                            name="History"
                                            size={20}
                                            color="#3b82f6"
                                        />
                                        <Text className="text-lg font-semibold text-foreground">
                                            Recent Orders
                                        </Text>
                                    </View>

                                    <View className="gap-3">
                                        {pastOrders.map((order) => (
                                            <AnimatedPressable key={order.id}>
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
                                                    </View>
                                                </View>
                                            </AnimatedPressable>
                                        ))}
                                    </View>
                                </Animated.View>
                            )}

                            {/* Empty state when nothing exists */}
                            {activeOrders.length === 0 &&
                                pastOrders.length === 0 &&
                                frequentItems.length === 0 && (
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
                                            your history and favorites here
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() =>
                                                router.push("/order/create")
                                            }
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
                    )}
                </ScrollView>
            </View>
        </ErrorBoundary>
    );
}

function HomeSkeleton() {
    return (
        <Skeleton>
            <View className="gap-8 px-4 pb-8 mt-4">
                {/* Active Orders Section Skeleton */}
                <View>
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row gap-2 items-center">
                            <SkeletonBlock width={20} height={20} />
                            <SkeletonBlock width={120} height={24} />
                        </View>
                        <SkeletonBlock
                            width={80}
                            height={28}
                            rounded="rounded-full"
                        />
                    </View>
                    <OrderCardSkeleton />
                </View>

                {/* Favorites Section Skeleton */}
                <View>
                    <View className="flex-row gap-2 items-center mb-4">
                        <SkeletonBlock width={20} height={20} />
                        <SkeletonBlock width={120} height={24} />
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        scrollEnabled={false}
                        className="px-4 -mx-4">
                        <View className="flex-row gap-3">
                            {[1, 2, 3].map((i) => (
                                <FavoriteItemSkeleton key={i} />
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Past Orders Section Skeleton */}
                <View>
                    <View className="flex-row gap-2 items-center mb-4">
                        <SkeletonBlock width={20} height={20} />
                        <SkeletonBlock width={130} height={24} />
                    </View>
                    <View className="gap-3">
                        {[1, 2, 3].map((i) => (
                            <PastOrderSkeleton key={i} />
                        ))}
                    </View>
                </View>
            </View>
        </Skeleton>
    );
}

function FavoriteItemSkeleton() {
    return (
        <View className="p-4 w-44 rounded-2xl border border-muted bg-card">
            <SkeletonBlock width={120} height={20} className="mb-2" />
            <SkeletonBlock width={100} height={16} className="mb-2" />
            <SkeletonBlock width={80} height={14} />
        </View>
    );
}

function PastOrderSkeleton() {
    return (
        <View className="p-4 rounded-2xl border border-muted bg-card">
            <View>
                <SkeletonBlock width={100} height={16} className="mb-2" />
                <SkeletonBlock width={180} height={22} />
            </View>
            <View className="flex-row gap-3 items-center pt-3 mt-3 border-t border-muted">
                <SkeletonBlock width={60} height={16} />
                <SkeletonBlock width={50} height={16} />
                <SkeletonBlock width={70} height={16} />
                <SkeletonBlock width={80} height={24} rounded="rounded-full" />
            </View>
        </View>
    );
}
