import { useState, useCallback, useEffect, useRef } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    InteractionManager,
} from "react-native";
import Animated, {
    FadeInUp,
    SlideInDown,
    SlideOutDown,
    FadeIn,
    FadeOut,
    Easing,
} from "react-native-reanimated";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { OrderCard, OrderCardSkeleton } from "@/components/order-card";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon, { type IconName } from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Skeleton } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBar } from "@/components/layout/header-bar";
import { PaymentSetupSplash } from "@/components/payment-setup-splash";
import { AnimatedPressable } from "@/components/common/animated-pressable";

type FilterType = "all" | "active" | "completed" | "needs_payment";
type TimeSection = "Today" | "This Week" | "Earlier";

const FILTERS: { key: FilterType; label: string; icon: IconName }[] = [
    { key: "all", label: "All", icon: "LayoutGrid" },
    { key: "active", label: "Active", icon: "Zap" },
    { key: "completed", label: "Completed", icon: "CircleCheck" },
    { key: "needs_payment", label: "Needs Payment", icon: "DollarSign" },
];

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
        .filter((title) => groups[title].length > 0)
        .map((title) => ({ title, data: groups[title] }));
}

const SECTION_ICONS: Record<TimeSection, IconName> = {
    Today: "CalendarDays",
    "This Week": "Calendar",
    Earlier: "CalendarClock",
};

export default function GroupsTab() {
    const { filter } = useLocalSearchParams<{ filter?: string }>();
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");

    useEffect(() => {
        if (
            filter === "active" ||
            filter === "completed" ||
            filter === "needs_payment"
        ) {
            setActiveFilter(filter);
        } else {
            setActiveFilter("all");
        }
    }, [filter]);
    const [showPaymentSplash, setShowPaymentSplash] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [isTransitionComplete, setIsTransitionComplete] = useState(false);
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();
    const listBottomPadding = 84 + insets.bottom;

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setIsTransitionComplete(true);
        });
        return () => task.cancel();
    }, []);

    // Get current user
    const currentUser = useQuery(api.users.getCurrentUser);

    // Check if user has Stripe payments set up
    const connectedAccount = useQuery(api.payments.getMyConnectedAccount);

    const handleCreateOrder = useCallback(() => {
        if (connectedAccount?.chargesEnabled) {
            router.push("/order/create");
        } else {
            setShowPaymentSplash(true);
        }
    }, [connectedAccount]);
    const userId = currentUser?._id;

    // Get orders with user details for avatars
    const data = useQuery(api.orders.getWithDetails);
    const isPending = data === undefined || currentUser === undefined || !isTransitionComplete;

    const filteredOrders = data?.filter((item) => {
        if (!userId) return false;
        const myOrderUser = item.orderUsers.find((ou) => ou.userId === userId);
        if (!myOrderUser) return false;

        // Filter by status chip
        if (activeFilter !== "all") {
            if (activeFilter === "active") {
                if (item.order.status !== "active") return false;
            } else if (activeFilter === "completed") {
                if (item.order.status !== "completed") return false;
            } else if (activeFilter === "needs_payment") {
                // Only show orders where the current user still owes money.
                if (item.order.status !== "active" || !item.order.paused)
                    return false;
                if (item.order.creatorId === userId) return false;
                if (Number(myOrderUser.amountOwed) <= 0) return false;
                if (
                    myOrderUser.settlementStatus !== "unpaid" &&
                    myOrderUser.settlementStatus !== "claimed"
                ) {
                    return false;
                }
            }
        }

        return true;
    });

    function renderOrderCard(item: NonNullable<typeof filteredOrders>[number]) {
        const orderUsers = item.orderUsers.map((ou) => ({
            id: ou.id,
            firstName: ou.user?.firstName,
            lastName: ou.user?.lastName,
            avatarUrl: ou.user?.avatarUrl,
        }));

        const locationNames = item.orderLocations
            ?.map((ol) => ol.name)
            .filter(Boolean);

        if (item.order.status === "active") {
            return (
                <Link
                    href={`/order/${item.order.id}`}
                    key={item.order.id}
                    asChild>
                    <AnimatedPressable>
                        <OrderCard
                            id={item.order.id}
                            name={item.order.name}
                            status={item.order.status}
                            paused={item.order.paused}
                            createdAt={item.order.createdAt}
                            orderUsers={orderUsers}
                            itemCount={item.itemsCount}
                            locationNames={locationNames}
                        />
                    </AnimatedPressable>
                </Link>
            );
        }

        const card = (
            <OrderCard
                key={item.order.id}
                id={item.order.id}
                name={item.order.name}
                status={item.order.status}
                paused={item.order.paused}
                createdAt={item.order.createdAt}
                orderUsers={orderUsers}
                itemCount={item.itemsCount}
                locationNames={locationNames}
                onReorder={() => {
                    const locationNamesParam = encodeURIComponent(
                        JSON.stringify(
                            item.orderLocations?.map((ol) => ol.name) ?? [],
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

        if (item.order.status === "completed") {
            return (
                <Link
                    href={`/order/completed-order?orderId=${item.order.id}`}
                    key={item.order.id}
                    asChild>
                    <AnimatedPressable>{card}</AnimatedPressable>
                </Link>
            );
        }

        return card;
    }

    return (
        <ErrorBoundary>
            <View
                style={{ paddingTop: insets.top }}
                className="flex-1 bg-background">
                <HeaderBar />
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingBottom: listBottomPadding,
                    }}
                    showsVerticalScrollIndicator={false}>
                    <View className="px-4">
                        {/* Filter + New Order Row */}
                        <Animated.View
                            entering={FadeInUp.duration(400)}
                            className="flex-row gap-3 justify-between items-center mt-4 mb-4">
                            {/* Filter Dropdown Button */}
                            <Pressable
                                onPress={() => setShowFilterMenu(true)}
                                className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-muted active:opacity-80">
                                <Icon
                                    name={
                                        FILTERS.find(
                                            (f) => f.key === activeFilter,
                                        )?.icon ?? "LayoutGrid"
                                    }
                                    size={16}
                                    color={NAV_THEME[colorScheme].text}
                                />
                                <Text className="text-sm font-medium text-foreground">
                                    {FILTERS.find((f) => f.key === activeFilter)
                                        ?.label ?? "All"}
                                </Text>
                                <Icon
                                    name="ChevronDown"
                                    size={14}
                                    color={NAV_THEME[colorScheme].text}
                                />
                            </Pressable>

                            {/* New Order Button */}
                            <Pressable
                                onPress={handleCreateOrder}
                                className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-primary active:opacity-80">
                                <Icon name="Plus" size={16} color="white" />
                                <Text className="text-sm font-semibold text-white">
                                    New Order
                                </Text>
                            </Pressable>
                        </Animated.View>

                        {/* Content */}
                        {isPending && (
                            <Skeleton>
                                <View className="gap-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <OrderCardSkeleton key={i} />
                                    ))}
                                </View>
                            </Skeleton>
                        )}

                        {!isPending && filteredOrders && (
                            <Animated.View
                                entering={FadeInUp.duration(400).delay(100)}>
                                {filteredOrders.length === 0 ? (
                                    <View className="items-center p-8 mt-4 rounded-2xl border border-dashed border-muted bg-card">
                                        <View className="justify-center items-center mb-4 w-16 h-16 rounded-2xl bg-yellow-500/10">
                                            <Icon
                                                name="Crown"
                                                size={32}
                                                color="#eab308"
                                            />
                                        </View>
                                        <Text className="text-base font-medium text-foreground">
                                            No orders yet
                                        </Text>
                                        <Text className="mt-1 text-sm text-center text-muted-foreground">
                                            Start a new order to get your group
                                            together
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleCreateOrder}
                                            className="flex-row items-center gap-2 px-5 py-2.5 mt-4 rounded-xl bg-primary">
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
                                    <View className="gap-6">
                                        {groupByTime(filteredOrders).map(
                                            (section) => (
                                                <View
                                                    key={section.title}
                                                    className="gap-3">
                                                    {/* Section Header */}
                                                    <View className="flex-row gap-2 items-center">
                                                        <Icon
                                                            name={
                                                                SECTION_ICONS[
                                                                    section
                                                                        .title
                                                                ]
                                                            }
                                                            size={16}
                                                            color={
                                                                NAV_THEME[
                                                                    colorScheme
                                                                ].text
                                                            }
                                                        />
                                                        <Text className="text-sm font-semibold text-muted-foreground">
                                                            {section.title}
                                                        </Text>
                                                        <View className="px-2 py-0.5 rounded-full bg-muted">
                                                            <Text className="text-xs text-muted-foreground">
                                                                {
                                                                    section.data
                                                                        .length
                                                                }
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {/* Cards */}
                                                    {section.data.map(
                                                        renderOrderCard,
                                                    )}
                                                </View>
                                            ),
                                        )}
                                    </View>
                                )}
                            </Animated.View>
                        )}
                    </View>
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

            {/* Filter Menu */}
            {showFilterMenu && (
                <View className="absolute inset-0" style={{ zIndex: 100 }}>
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                        className="absolute inset-0">
                        <Pressable
                            onPress={() => setShowFilterMenu(false)}
                            className="flex-1 bg-black/40"
                        />
                    </Animated.View>
                    <View className="flex-1 justify-end">
                        <Animated.View
                            entering={SlideInDown.duration(300).easing(
                                Easing.out(Easing.ease),
                            )}
                            exiting={SlideOutDown.duration(200).easing(
                                Easing.in(Easing.ease),
                            )}
                            style={{ marginBottom: insets.bottom + 60 }}
                            className="overflow-hidden mx-4 rounded-2xl border bg-card border-muted">
                            <View className="p-4 border-b border-muted">
                                <Text className="text-base font-semibold text-foreground">
                                    Filter Orders
                                </Text>
                            </View>
                            {FILTERS.map((f) => {
                                const isActive = activeFilter === f.key;
                                return (
                                    <Pressable
                                        key={f.key}
                                        onPress={() => {
                                            setActiveFilter(f.key);
                                            setShowFilterMenu(false);
                                        }}
                                        className={`flex-row items-center gap-3 px-4 py-3.5 ${
                                            isActive ? "bg-primary/10" : ""
                                        } active:opacity-70`}>
                                        <Icon
                                            name={f.icon}
                                            size={18}
                                            color={
                                                isActive
                                                    ? NAV_THEME[colorScheme]
                                                          .primary
                                                    : NAV_THEME[colorScheme]
                                                          .text
                                            }
                                        />
                                        <Text
                                            className={`flex-1 text-base ${
                                                isActive
                                                    ? "font-semibold text-primary"
                                                    : "text-foreground"
                                            }`}>
                                            {f.label}
                                        </Text>
                                        {isActive && (
                                            <Icon
                                                name="Check"
                                                size={18}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .primary
                                                }
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </Animated.View>
                    </View>
                </View>
            )}
        </ErrorBoundary>
    );
}
