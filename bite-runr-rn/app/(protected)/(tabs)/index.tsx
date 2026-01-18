import React from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
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
                <ScrollView className="flex-1 px-6 py-0">
                    {isLoading && (
                        <View className="items-center mt-10">
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
                        <View className="gap-6 pb-8 mt-4">
                            {/* Active Orders Section */}
                            <View>
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center gap-2">
                                        <Icon
                                            name="Clock"
                                            size={20}
                                            color={NAV_THEME[colorScheme].primary}
                                        />
                                        <Text className="text-xl font-semibold text-foreground">
                                            Active Orders
                                        </Text>
                                    </View>
                                    {activeOrders.length > 0 && (
                                        <View className="px-2 py-1 rounded-full bg-primary/20">
                                            <Text className="text-xs font-medium text-primary">
                                                {activeOrders.length} active
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {activeOrders.length === 0 ? (
                                    <View className="items-center p-6 border rounded-2xl border-border bg-card">
                                        <Icon
                                            name="ShoppingBag"
                                            size={32}
                                            color={NAV_THEME[colorScheme].text}
                                        />
                                        <Text className="mt-2 text-muted-foreground">
                                            No active orders
                                        </Text>
                                        <Pressable
                                            onPress={() =>
                                                router.push("/order/create")
                                            }
                                            className="flex-row items-center gap-1 mt-2">
                                            <Icon
                                                name="Plus"
                                                size={16}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .primary
                                                }
                                            />
                                            <Text className="font-medium text-primary">
                                                Start a new order
                                            </Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View className="gap-3">
                                        {activeOrders.map((order) => (
                                            <Pressable
                                                key={order.id}
                                                onPress={() =>
                                                    router.push(
                                                        `/order/${order.id}`
                                                    )
                                                }>
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
                                    </View>
                                )}
                            </View>

                            {/* Frequently Ordered Items Section */}
                            {frequentItems.length > 0 && (
                                <View>
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <Icon
                                            name="Star"
                                            size={20}
                                            color={NAV_THEME[colorScheme].primary}
                                        />
                                        <Text className="text-xl font-semibold text-foreground">
                                            Your Favorites
                                        </Text>
                                    </View>

                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        className="-mx-6 px-6">
                                        <View className="flex-row gap-3">
                                            {frequentItems.map((item) => (
                                                <View
                                                    key={item.id}
                                                    className="p-4 border w-44 rounded-2xl border-border bg-card">
                                                    <View className="flex-row items-center justify-between mb-2">
                                                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-primary/20">
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
                                                        <View className="px-2 py-1 rounded-full bg-muted">
                                                            <Text className="text-xs font-medium text-muted-foreground">
                                                                x{item.totalOrdered}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text
                                                        className="text-base font-semibold text-foreground"
                                                        numberOfLines={2}>
                                                        {item.name}
                                                    </Text>
                                                    <Text
                                                        className="mt-1 text-sm text-muted-foreground"
                                                        numberOfLines={1}>
                                                        {item.locationName}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            {/* Past Orders Section */}
                            {pastOrders.length > 0 && (
                                <View>
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <Icon
                                            name="History"
                                            size={20}
                                            color={NAV_THEME[colorScheme].primary}
                                        />
                                        <Text className="text-xl font-semibold text-foreground">
                                            Past Orders
                                        </Text>
                                    </View>

                                    <View className="gap-3">
                                        {pastOrders.map((order) => (
                                            <Pressable
                                                key={order.id}>
                                                <View className="p-4 border rounded-2xl border-border bg-card">
                                                    <View className="flex-row items-start justify-between">
                                                        <View className="flex-1">
                                                            <Text className="text-lg font-semibold text-foreground">
                                                                {order.name}
                                                            </Text>
                                                            <Text className="mt-1 text-sm text-muted-foreground">
                                                                {new Date(
                                                                    order.createdAt
                                                                ).toLocaleDateString(
                                                                    "en-US",
                                                                    {
                                                                        month: "short",
                                                                        day: "numeric",
                                                                        year: "numeric",
                                                                    }
                                                                )}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            className={`px-2 py-1 rounded-full ${
                                                                order.status ===
                                                                "completed"
                                                                    ? "bg-green-500/20"
                                                                    : "bg-red-500/20"
                                                            }`}>
                                                            <Text
                                                                className={`text-xs font-medium ${
                                                                    order.status ===
                                                                    "completed"
                                                                        ? "text-green-600"
                                                                        : "text-red-500"
                                                                }`}>
                                                                {order.status ===
                                                                "completed"
                                                                    ? "Completed"
                                                                    : "Cancelled"}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View className="flex-row items-center gap-4 mt-3">
                                                        <View className="flex-row items-center gap-1">
                                                            <Icon
                                                                name="Package"
                                                                size={14}
                                                                color={
                                                                    NAV_THEME[
                                                                        colorScheme
                                                                    ].text
                                                                }
                                                            />
                                                            <Text className="text-sm text-muted-foreground">
                                                                {order.itemsCount}{" "}
                                                                items
                                                            </Text>
                                                        </View>
                                                        {order.userAmount > 0 && (
                                                            <View className="flex-row items-center gap-1">
                                                                <Icon
                                                                    name="DollarSign"
                                                                    size={14}
                                                                    color={
                                                                        NAV_THEME[
                                                                            colorScheme
                                                                        ].text
                                                                    }
                                                                />
                                                                <Text className="text-sm text-muted-foreground">
                                                                    $
                                                                    {(
                                                                        Number(order.userAmount) /
                                                                        100
                                                                    ).toFixed(2)}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        <View className="flex-row items-center gap-1">
                                                            <Icon
                                                                name="Users"
                                                                size={14}
                                                                color={
                                                                    NAV_THEME[
                                                                        colorScheme
                                                                    ].text
                                                                }
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
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Empty state when nothing exists */}
                            {activeOrders.length === 0 &&
                                pastOrders.length === 0 &&
                                frequentItems.length === 0 && (
                                    <View className="items-center p-8">
                                        <Icon
                                            name="Package"
                                            size={48}
                                            color={NAV_THEME[colorScheme].border}
                                        />
                                        <Text className="mt-4 text-lg font-medium text-foreground">
                                            Welcome to BiteRunr
                                        </Text>
                                        <Text className="mt-2 text-center text-muted-foreground">
                                            Start your first order to see your
                                            order history and favorites here.
                                        </Text>
                                    </View>
                                )}
                        </View>
                    )}
                </ScrollView>
            </ErrorBoundary>
        </PageWithHeader>
    );
}
