// HomeTab.tsx
import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { PageWithHeader } from "@/components/layout/page-with-header";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function HomeTab() {
    const data = useQuery(api.orders.getWithDetails);
    const isPending = data === undefined;

    return (
        <PageWithHeader title="Account">
            <ErrorBoundary>
                <ScrollView className="flex-1 px-6 py-0">
                {isPending && (
                    <View className="mt-6">
                        <ActivityIndicator />
                        <Text className="mt-2 text-muted-foreground">
                            Loading orders...
                        </Text>
                    </View>
                )}

                {!isPending && (!data || data.length === 0) && (
                    <View className="mt-6">
                        <Text className="text-muted-foreground">
                            No orders found.
                        </Text>
                    </View>
                )}

                {!isPending && data && data.length > 0 && (
                    <View className="mt-6">
                        <Text className="mb-2 text-xl font-semibold">
                            Your Orders
                        </Text>

                        {data.map(
                            ({
                                order,
                                orderUsers,
                                itemsCount,
                                peopleCount,
                            }) => (
                                <View key={order.id} className="mb-4">
                                    <Text className="text-lg text-foreground">
                                        {order.name}
                                    </Text>
                                    <Text className="text-muted-foreground">
                                        Status: {order.status} • Items:{" "}
                                        {itemsCount} • People: {peopleCount}
                                    </Text>

                                    <View className="mt-2">
                                        {orderUsers.map((ou) => (
                                            <View key={ou.id} className="py-1">
                                                <Text className="text-foreground">
                                                    {ou.user?.firstName}{" "}
                                                    {ou.user?.lastName} —{" "}
                                                    {ou.status}
                                                </Text>
                                                <Text className="text-muted-foreground">
                                                    Owes ${(ou.amountOwed / 100).toFixed(2)}
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
            </ErrorBoundary>
        </PageWithHeader>
    );
}
