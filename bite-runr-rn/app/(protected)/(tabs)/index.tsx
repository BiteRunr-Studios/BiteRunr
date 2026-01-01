import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getUserOrdersDetails } from "@/api/home/orders";
import { UserOrderDetails } from "@/lib/types";

export default function HomeTab() {
    const { data, isPending, isError, error } = useQuery<UserOrderDetails[]>({
        queryKey: ["userOrdersDetails"],
        queryFn: getUserOrdersDetails,
    });

    return (
        <ScrollView className="flex-1 px-6 py-0">
            {isPending && (
                <View className="mt-6">
                    <ActivityIndicator />
                    <Text className="mt-2 text-muted-foreground">
                        Loading orders…
                    </Text>
                </View>
            )}

            {isError && (
                <View className="mt-6">
                    <Text className="font-semibold text-red-600">
                        Failed to load orders
                    </Text>
                    <Text className="text-muted-foreground">
                        {(error as Error)?.message ?? "Unknown error"}
                    </Text>
                </View>
            )}

            {!isPending && !isError && (!data || data.length === 0) && (
                <View className="mt-6">
                    <Text className="text-muted-foreground">
                        No orders found.
                    </Text>
                </View>
            )}

            {!isPending && !isError && data && (
                <View className="mt-6">
                    <Text className="mb-2 text-xl font-semibold">
                        Your Orders
                    </Text>

                    {data.map(
                        ({ order, order_users, items_count, people_count }) => (
                            <View key={order.id} className="mb-4">
                                <Text className="text-lg text-foreground">
                                    {order.name}
                                </Text>
                                <Text className="text-muted-foreground">
                                    Status: {order.status} • Items:{" "}
                                    {items_count} • People: {people_count}
                                </Text>

                                <View className="mt-2">
                                    {order_users.map((ou) => (
                                        <View key={ou.id} className="py-1">
                                            <Text className="text-foreground">
                                                {ou.user.first_name}{" "}
                                                {ou.user.last_name} —{" "}
                                                {ou.status}
                                            </Text>
                                            <Text className="text-muted-foreground">
                                                Owes ${ou.amount_owed}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )
                    )}
                </View>
            )}
        </ScrollView>
    );
}
