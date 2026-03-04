import { useState, useCallback, useEffect } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { OrderCard, OrderCardSkeleton } from "@/components/order-card";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Input } from "@/components/common/input";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon, { type IconName } from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Skeleton } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBar } from "@/components/layout/header-bar";
import { PaymentSetupSplash } from "@/components/payment-setup-splash";

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
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");

    useEffect(() => {
        if (
            filter === "active" ||
            filter === "completed" ||
            filter === "needs_payment"
        ) {
            setActiveFilter(filter);
        }
    }, [filter]);
    const [showPaymentSplash, setShowPaymentSplash] = useState(false);
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();

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
    const isPending = data === undefined || currentUser === undefined;

    const filteredOrders = data?.filter((item) => {
        if (!userId) return false;

        // Filter by creator (Created by me vs Invited to)
        const matchesCreator =
            selectedIndex === 0
                ? item.order.creatorId === userId
                : item.order.creatorId !== userId;

        if (!matchesCreator) return false;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const orderName = item.order.name?.toLowerCase() || "";
            const orderComments = item.order.comments?.toLowerCase() || "";

            const matchesSearch =
                orderName.includes(query) || orderComments.includes(query);

            if (!matchesSearch) return false;
        }

        // Filter by status chip
        if (activeFilter !== "all") {
            if (activeFilter === "active") {
                if (item.order.status !== "active") return false;
            } else if (activeFilter === "completed") {
                if (item.order.status !== "completed") return false;
            } else if (activeFilter === "needs_payment") {
                // Only show active+paused orders where prices have been set via receipt scanning
                if (item.order.status !== "active" || !item.order.paused) return false;
                const hasUnsettled = item.orderUsers.some(
                    (ou) =>
                        (ou.settlementStatus === "unpaid" ||
                            ou.settlementStatus === "claimed") &&
                        Number(ou.amountOwed) > 0,
                );
                if (!hasUnsettled) return false;
            }
        }

        return true;
    });

    const tabs = [
        { label: "Created by me", icon: "Crown" as const },
        { label: "Invited to", icon: "UserPlus" as const },
    ];

    function renderOrderCard(item: NonNullable<typeof filteredOrders>[number]) {
        const orderUsers = item.orderUsers.map((ou) => ({
            id: ou.id,
            firstName: ou.user?.firstName,
            lastName: ou.user?.lastName,
            avatarUrl: ou.user?.avatarUrl,
        }));

        const locationNames = item.orderLocations
            ?.map((ol) => ol.locationName)
            .filter(Boolean);

        if (item.order.status === "active") {
            return (
                <Link
                    href={`/order/${item.order.id}`}
                    key={item.order.id}
                    asChild>
                    <Pressable>
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
                    </Pressable>
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
                    const locationIds =
                        item.orderLocations
                            ?.map((ol) => ol.locationId)
                            .join(",") ?? "";
                    const friendIds = item.orderUsers
                        .filter((ou) => ou.userId !== userId)
                        .map((ou) => ou.userId)
                        .join(",");
                    router.push(
                        `/order/create?reorderName=${encodeURIComponent(item.order.name)}&reorderLocationIds=${locationIds}&reorderFriendIds=${friendIds}`,
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
                    <Pressable>{card}</Pressable>
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
                        paddingBottom: 80 + insets.bottom,
                    }}
                    showsVerticalScrollIndicator={false}>
                    <View className="flex-1 px-4">
                        {/* Tab Selector */}
                        <View className="flex-row gap-2 mt-4 mb-4">
                            {tabs.map((tab, index) => (
                                <Pressable
                                    key={tab.label}
                                    onPress={() => setSelectedIndex(index)}
                                    className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${
                                        selectedIndex === index
                                            ? "bg-primary"
                                            : "bg-muted"
                                    }`}>
                                    <Icon
                                        name={tab.icon}
                                        size={16}
                                        color={
                                            selectedIndex === index
                                                ? "white"
                                                : NAV_THEME[colorScheme].text
                                        }
                                    />
                                    <Text
                                        className={`font-medium ${
                                            selectedIndex === index
                                                ? "text-white"
                                                : "text-foreground"
                                        }`}>
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Search Bar */}
                        <View className="mb-3">
                            <Input
                                value={searchQuery}
                                placeholder="Search orders..."
                                leftIcon="Search"
                                rightIcon="CirclePlus"
                                onRightIconPress={handleCreateOrder}
                                autoCapitalize="none"
                                returnKeyType="search"
                                errorMessage=""
                                onChangeText={setSearchQuery}
                                onBlur={() => null}
                            />
                        </View>

                        {/* Filter Chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mb-4 -mx-4 px-4"
                            contentContainerStyle={{ gap: 8 }}>
                            {FILTERS.map((filter) => {
                                const isActive = activeFilter === filter.key;
                                return (
                                    <Pressable
                                        key={filter.key}
                                        onPress={() =>
                                            setActiveFilter(filter.key)
                                        }
                                        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
                                            isActive
                                                ? "bg-primary"
                                                : "bg-muted"
                                        }`}>
                                        <Icon
                                            name={filter.icon}
                                            size={14}
                                            color={
                                                isActive
                                                    ? "white"
                                                    : NAV_THEME[colorScheme]
                                                          .text
                                            }
                                        />
                                        <Text
                                            className={`text-xs font-medium ${
                                                isActive
                                                    ? "text-white"
                                                    : "text-foreground"
                                            }`}>
                                            {filter.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

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
                            <>
                                {filteredOrders.length === 0 ? (
                                    <View className="items-center p-8 mt-4 rounded-2xl border border-dashed border-muted bg-card">
                                        <View
                                            className={`items-center justify-center w-16 h-16 mb-4 rounded-2xl ${
                                                selectedIndex === 0
                                                    ? "bg-yellow-500/10"
                                                    : "bg-blue-500/10"
                                            }`}>
                                            <Icon
                                                name={
                                                    selectedIndex === 0
                                                        ? "Crown"
                                                        : "UserPlus"
                                                }
                                                size={32}
                                                color={
                                                    selectedIndex === 0
                                                        ? "#eab308"
                                                        : "#3b82f6"
                                                }
                                            />
                                        </View>
                                        <Text className="text-base font-medium text-foreground">
                                            {searchQuery
                                                ? "No matching orders"
                                                : selectedIndex === 0
                                                  ? "No orders created"
                                                  : "No invitations yet"}
                                        </Text>
                                        <Text className="mt-1 text-sm text-center text-muted-foreground">
                                            {searchQuery
                                                ? "Try a different search term"
                                                : selectedIndex === 0
                                                  ? "Start a new order to get your group together"
                                                  : "When friends invite you to an order, it'll show up here"}
                                        </Text>
                                        {selectedIndex === 0 &&
                                            !searchQuery && (
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
                                            )}
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
                            </>
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
        </ErrorBoundary>
    );
}
