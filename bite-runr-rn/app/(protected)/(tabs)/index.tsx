import React from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import { PageWithHeader } from "@/components/layout/page-with-header";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OrderCard } from "@/components/order-card";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useRouter } from "expo-router";

// Constants for active orders carousel
const CARD_WIDTH = 300;
const CARD_GAP = 16;
const CARD_SNAP_WIDTH = CARD_WIDTH + CARD_GAP;

export default function HomeTab() {
    const activeOrders = useQuery(api.orders.getActiveOrders);
    const pastOrders = useQuery(api.orders.getPastOrders, { limit: 3 });
    const frequentItems = useQuery(api.orders.getFrequentItems, { limit: 6 });
    const { colorScheme } = useColorScheme();
    const router = useRouter();

    const isLoading =
        activeOrders === undefined ||
        pastOrders === undefined ||
        frequentItems === undefined;

    return (
        <PageWithHeader title="Home">
            <ErrorBoundary>
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}>
                    {isLoading && (
                        <View className="items-center mt-16">
                            <ActivityIndicator
                                size="large"
                                color={NAV_THEME[colorScheme].primary}
                            />
                            <Text className="mt-3 text-muted-foreground">
                                Loading...
                            </Text>
                        </View>
                    )}

                    {!isLoading && (
                        <View className="gap-8 px-4 pb-8 mt-4">
                            {/* Active Orders Section - only show if there are active orders OR if there's other data */}
                            {(activeOrders.length > 0 || pastOrders.length > 0 || frequentItems.length > 0) && (
                            <View>
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-row items-center gap-3">
                                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                                            <Icon
                                                name="Zap"
                                                size={20}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .primary
                                                }
                                            />
                                        </View>
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
                                    <View className="items-center p-8 border rounded-2xl border-dashed border-muted bg-card">
                                        <View className="items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-primary/10">
                                            <Icon
                                                name="ShoppingBag"
                                                size={32}
                                                color={NAV_THEME[colorScheme].primary}
                                            />
                                        </View>
                                        <Text className="text-base font-medium text-foreground">
                                            No active orders
                                        </Text>
                                        <Text className="mt-1 text-sm text-center text-muted-foreground">
                                            Start a new order to get your group
                                            together
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() =>
                                                router.push("/order/create")
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
                                    </View>
                                ) : (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        decelerationRate="fast"
                                        snapToOffsets={activeOrders.map((_, i) => i * CARD_SNAP_WIDTH)}
                                        snapToAlignment="start"
                                        className="-mx-4"
                                        contentContainerStyle={{ paddingHorizontal: 16 }}>
                                        {activeOrders.map((order, index) => (
                                            <Pressable
                                                key={order.id}
                                                onPress={() =>
                                                    router.push(
                                                        `/order/${order.id}`
                                                    )
                                                }
                                                style={{
                                                    width: CARD_WIDTH,
                                                    marginRight: index < activeOrders.length - 1 ? CARD_GAP : 0
                                                }}>
                                                <OrderCard
                                                    id={order.id}
                                                    name={order.name}
                                                    comments={order.comments}
                                                    status={order.status}
                                                    paused={order.paused}
                                                    createdAt={order.createdAt}
                                                    orderUsers={order.orderUsers}
                                                />
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                            )}

                            {/* Frequently Ordered Items Section */}
                            {frequentItems.length > 0 && (
                                <View>
                                    <View className="flex-row items-center gap-3 mb-4">
                                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/10">
                                            <Icon
                                                name="Star"
                                                size={20}
                                                color="#eab308"
                                            />
                                        </View>
                                        <Text className="text-lg font-semibold text-foreground">
                                            Your Favorites
                                        </Text>
                                    </View>

                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        className="-mx-4 px-4">
                                        <View className="flex-row gap-3">
                                            {frequentItems.map((item) => (
                                                <View
                                                    key={item.id}
                                                    className="p-4 border w-44 rounded-2xl border-muted bg-card">
                                                    <View className="flex-row items-center justify-between mb-3">
                                                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                                                            <Icon
                                                                name="UtensilsCrossed"
                                                                size={20}
                                                                color={
                                                                    NAV_THEME[
                                                                        colorScheme
                                                                    ].primary
                                                                }
                                                            />
                                                        </View>
                                                        <View className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-muted">
                                                            <Icon
                                                                name="RefreshCw"
                                                                size={10}
                                                                color={
                                                                    NAV_THEME[
                                                                        colorScheme
                                                                    ].text
                                                                }
                                                            />
                                                            <Text className="text-xs font-medium text-muted-foreground">
                                                                x
                                                                {
                                                                    item.totalOrdered
                                                                }
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text
                                                        className="text-base font-semibold text-foreground"
                                                        numberOfLines={2}>
                                                        {item.name}
                                                    </Text>
                                                    <View className="flex-row items-center gap-1 mt-2">
                                                        <Icon
                                                            name="MapPin"
                                                            size={12}
                                                            color={
                                                                NAV_THEME[
                                                                    colorScheme
                                                                ].border
                                                            }
                                                        />
                                                        <Text
                                                            className="text-xs text-muted-foreground"
                                                            numberOfLines={1}>
                                                            {item.locationName}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            {/* Past Orders Section */}
                            {pastOrders.length > 0 && (
                                <View>
                                    <View className="flex-row items-center gap-3 mb-4">
                                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10">
                                            <Icon
                                                name="History"
                                                size={20}
                                                color="#3b82f6"
                                            />
                                        </View>
                                        <Text className="text-lg font-semibold text-foreground">
                                            Recent Orders
                                        </Text>
                                    </View>

                                    <View className="gap-3">
                                        {pastOrders.map((order) => (
                                            <View
                                                key={order.id}
                                                className="p-4 border rounded-2xl border-muted bg-card">
                                                <View className="flex-row items-start justify-between">
                                                    <View className="flex-1">
                                                        <Text className="text-sm text-muted-foreground">
                                                            {new Date(
                                                                order.createdAt
                                                            ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    weekday:
                                                                        "short",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                }
                                                            )}
                                                        </Text>
                                                        <Text className="mt-1 text-lg font-semibold text-foreground">
                                                            {order.name}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${
                                                            order.status ===
                                                            "completed"
                                                                ? "bg-green-500/10"
                                                                : "bg-red-500/10"
                                                        }`}>
                                                        <Icon
                                                            name={
                                                                order.status ===
                                                                "completed"
                                                                    ? "CircleCheck"
                                                                    : "CircleX"
                                                            }
                                                            size={12}
                                                            color={
                                                                order.status ===
                                                                "completed"
                                                                    ? "#22c55e"
                                                                    : "#ef4444"
                                                            }
                                                        />
                                                        <Text
                                                            className={`text-xs font-medium ${
                                                                order.status ===
                                                                "completed"
                                                                    ? "text-green-500"
                                                                    : "text-red-500"
                                                            }`}>
                                                            {order.status ===
                                                            "completed"
                                                                ? "Completed"
                                                                : "Cancelled"}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View className="flex-row items-center gap-4 pt-3 mt-3 border-t border-muted">
                                                    <View className="flex-row items-center gap-1.5">
                                                        <Icon
                                                            name="ShoppingBag"
                                                            size={14}
                                                            color={
                                                                NAV_THEME[
                                                                    colorScheme
                                                                ].border
                                                            }
                                                        />
                                                        <Text className="text-sm text-muted-foreground">
                                                            {order.itemsCount}{" "}
                                                            items
                                                        </Text>
                                                    </View>
                                                    {order.userAmount > 0 && (
                                                        <View className="flex-row items-center gap-1.5">
                                                            <Icon
                                                                name="DollarSign"
                                                                size={14}
                                                                color={
                                                                    NAV_THEME[
                                                                        colorScheme
                                                                    ].border
                                                                }
                                                            />
                                                            <Text className="text-sm text-muted-foreground">
                                                                $
                                                                {(
                                                                    Number(
                                                                        order.userAmount
                                                                    ) / 100
                                                                ).toFixed(2)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View className="flex-row items-center gap-1.5">
                                                        <Icon
                                                            name="Users"
                                                            size={14}
                                                            color={
                                                                NAV_THEME[
                                                                    colorScheme
                                                                ].border
                                                            }
                                                        />
                                                        <Text className="text-sm text-muted-foreground">
                                                            {
                                                                order.orderUsers
                                                                    .length
                                                            }{" "}
                                                            people
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Empty state when nothing exists */}
                            {activeOrders.length === 0 &&
                                pastOrders.length === 0 &&
                                frequentItems.length === 0 && (
                                    <View className="items-center p-8 mt-8">
                                        <View className="items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-primary/10">
                                            <Icon
                                                name="Utensils"
                                                size={40}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .primary
                                                }
                                            />
                                        </View>
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
                                            className="flex-row items-center gap-2 px-6 py-3 mt-6 rounded-xl bg-primary">
                                            <Icon
                                                name="Plus"
                                                size={20}
                                                color="white"
                                            />
                                            <Text className="text-base font-semibold text-white">
                                                Create Your First Order
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                        </View>
                    )}
                </ScrollView>
            </ErrorBoundary>
        </PageWithHeader>
    );
}
