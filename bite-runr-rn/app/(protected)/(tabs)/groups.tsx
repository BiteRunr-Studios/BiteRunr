import { useState } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { OrderCard, OrderCardSkeleton } from "@/components/order-card";
import { Link, router } from "expo-router";
import { Input } from "@/components/common/input";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Skeleton } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBar } from "@/components/layout/header-bar";

export default function GroupsTab() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();

    // Get current user
    const currentUser = useQuery(api.users.getCurrentUser);
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

            return matchesSearch;
        }

        return true;
    });

    const tabs = [
        { label: "Created by me", icon: "Crown" as const },
        { label: "Invited to", icon: "UserPlus" as const },
    ];

    return (
        <ErrorBoundary>
            <View
                style={{ paddingTop: insets.top }}
                className="flex-1 bg-background">
                <HeaderBar />
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
                    <View className="mb-4">
                        <Input
                            value={searchQuery}
                            placeholder="Search orders..."
                            leftIcon="Search"
                            rightIcon="CirclePlus"
                            onRightIconPress={() =>
                                router.push("/order/create")
                            }
                            autoCapitalize="none"
                            returnKeyType="search"
                            errorMessage=""
                            onChangeText={setSearchQuery}
                            onBlur={() => null}
                        />
                    </View>

                    {/* Content */}
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{
                            paddingBottom: 80 + insets.bottom,
                        }}
                        showsVerticalScrollIndicator={false}>
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
                                                    onPress={() =>
                                                        router.push(
                                                            "/order/create",
                                                        )
                                                    }
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
                                    <View className="gap-3">
                                        {filteredOrders.map((item) => {
                                            const orderUsers =
                                                item.orderUsers.map((ou) => ({
                                                    id: ou.id,
                                                    firstName:
                                                        ou.user?.firstName,
                                                    lastName: ou.user?.lastName,
                                                    avatarUrl:
                                                        ou.user?.avatarUrl,
                                                }));

                                            return item.order.status ===
                                                "active" ? (
                                                <Link
                                                    href={`/order/${item.order.id}`}
                                                    key={item.order.id}
                                                    asChild>
                                                    <Pressable>
                                                        <OrderCard
                                                            id={item.order.id}
                                                            name={
                                                                item.order.name
                                                            }
                                                            comments={
                                                                item.order
                                                                    .comments
                                                            }
                                                            status={
                                                                item.order
                                                                    .status
                                                            }
                                                            paused={
                                                                item.order
                                                                    .paused
                                                            }
                                                            createdAt={
                                                                item.order
                                                                    .createdAt
                                                            }
                                                            orderUsers={
                                                                orderUsers
                                                            }
                                                            itemCount={
                                                                item.itemsCount
                                                            }
                                                        />
                                                    </Pressable>
                                                </Link>
                                            ) : (
                                                <OrderCard
                                                    key={item.order.id}
                                                    id={item.order.id}
                                                    name={item.order.name}
                                                    comments={
                                                        item.order.comments
                                                    }
                                                    status={item.order.status}
                                                    paused={item.order.paused}
                                                    createdAt={
                                                        item.order.createdAt
                                                    }
                                                    orderUsers={orderUsers}
                                                    itemCount={item.itemsCount}
                                                />
                                            );
                                        })}
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </ErrorBoundary>
    );
}
