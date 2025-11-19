import { Alert, ScrollView, Text, View } from "react-native";
import { PageWithHeader } from "@/components/page-with-header";
import { useColorScheme } from "@/lib/use-color-scheme";
import { AwaitingOrdersDTO } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { getOrder } from "@/api/order/single";

export default function SpecificOrder() {
    const { isDarkColorScheme } = useColorScheme();
    const { orderId } = useLocalSearchParams();

    const { data, isPending, isError, error } = useQuery<AwaitingOrdersDTO>({
        queryKey: ["order", orderId],
        queryFn: () => getOrder(orderId as string),
        refetchInterval: 2_500,
    });

    if (isPending) {
        return (
            <PageWithHeader title="Order Details">
                <View className="items-center justify-center flex-1 px-6">
                    <Text className="text-foreground">Loading...</Text>
                </View>
            </PageWithHeader>
        );
    }

    if (isError) {
        return (
            <PageWithHeader title="Order Details">
                <View className="items-center justify-center flex-1 px-6">
                    <Text className="text-destructive">
                        Error: {error?.message ?? "Failed to load order"}
                    </Text>
                </View>
            </PageWithHeader>
        );
    }

    return (
        <PageWithHeader title="Order Details">
            <ScrollView className="flex-1 px-6">
                {/* Order Information */}
                <View className="py-4 border-b border-border">
                    <Text className="mb-2 text-2xl font-bold text-foreground">
                        {data?.order.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                        {orderId}
                    </Text>
                    <View className="flex-row gap-2 mb-2">
                        <Text className="text-sm text-muted-foreground">
                            Status:
                        </Text>
                        <Text className="text-sm font-semibold capitalize text-foreground">
                            {data?.order.status}
                        </Text>
                    </View>
                    {data?.order.paused && (
                        <View className="px-3 py-2 mb-2 bg-yellow-100 rounded-md dark:bg-yellow-900/20">
                            <Text className="text-yellow-800 dark:text-yellow-200">
                                Order is paused
                            </Text>
                        </View>
                    )}
                    {data?.order.comments && (
                        <View className="mt-2">
                            <Text className="mb-1 text-sm text-muted-foreground">
                                Comments:
                            </Text>
                            <Text className="text-foreground">
                                {data.order.comments}
                            </Text>
                        </View>
                    )}
                    <Text className="mt-2 text-sm text-muted-foreground">
                        Total Items: {data?.count ?? 0}
                    </Text>
                </View>

                {/* Participants */}
                <View className="py-4 border-b border-border">
                    <Text className="mb-3 text-xl font-semibold text-foreground">
                        Participants ({data?.order_users.length ?? 0})
                    </Text>
                    {data?.order_users.map((orderUser) => (
                        <View
                            key={orderUser.id}
                            className="p-4 mb-3 border rounded-lg bg-card border-border">
                            <View className="flex-row items-start justify-between mb-2">
                                <View className="flex-1">
                                    <Text className="font-semibold text-foreground">
                                        {orderUser.user.first_name}{" "}
                                        {orderUser.user.last_name}
                                    </Text>
                                    <Text className="text-sm capitalize text-muted-foreground">
                                        {orderUser.status}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-sm text-muted-foreground">
                                        Amount Owed
                                    </Text>
                                    <Text className="text-lg font-bold text-foreground">
                                        ${orderUser.amount_owed}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Locations */}
                {data?.order_locations && data.order_locations.length > 0 && (
                    <View className="py-4">
                        <Text className="mb-3 text-xl font-semibold text-foreground">
                            Locations ({data.order_locations.length})
                        </Text>
                        {data.order_locations.map((location) => (
                            <View
                                key={location.id}
                                className="p-3 mb-2 border rounded-lg bg-card border-border">
                                <Text className="text-foreground">
                                    Location ID: {location.location_id}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </PageWithHeader>
    );
}
