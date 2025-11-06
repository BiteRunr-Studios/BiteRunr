// HomeTab.tsx
import React from "react";
import { Alert, ActivityIndicator, ScrollView, Text, View } from "react-native";
import { PageWithHeader } from "@/components/page-with-header";
import { useQuery } from "@tanstack/react-query";
import { getUserOrdersDetails } from "@/api/orders";
import { UserOrderDetails } from "@/lib/types";

export default function HomeTab() {
  const { data, isPending, isError, error } = useQuery<UserOrderDetails[]>({
    queryKey: ["userOrdersDetails"],
    queryFn: getUserOrdersDetails,
  });

  return (
    <PageWithHeader
      title="Account"
      logoSource={require("@/assets/images/app-logo.png")}
      onLogoPress={() => Alert.alert("Logo pressed")}
      onBellPress={() => Alert.alert("Notifications")}
    >
      <ScrollView className="flex-1 p-6">
        {isPending && (
          <View className="mt-6">
            <ActivityIndicator />
            <Text className="mt-2 text-muted-foreground">Loading orders…</Text>
          </View>
        )}

        {isError && (
          <View className="mt-6">
            <Text className="text-red-600 font-semibold">
              Failed to load orders
            </Text>
            <Text className="text-muted-foreground">
              {(error as Error)?.message ?? "Unknown error"}
            </Text>
          </View>
        )}

        {!isPending && !isError && (!data || data.length === 0) && (
          <View className="mt-6">
            <Text className="text-muted-foreground">No orders found.</Text>
          </View>
        )}

        {!isPending && !isError && data && (
          <View className="mt-6">
            <Text className="text-xl font-semibold mb-2">Your Orders</Text>

            {data.map(({ order, order_users, items_count, people_count }) => (
              <View key={order.id} className="mb-4">
                <Text className="text-foreground text-lg">{order.name}</Text>
                <Text className="text-muted-foreground">
                  Status: {order.status} • Items: {items_count} • People:{" "}
                  {people_count}
                </Text>

                <View className="mt-2">
                  {order_users.map((ou) => (
                    <View key={ou.id} className="py-1">
                      <Text className="text-foreground">
                        {ou.user.first_name} {ou.user.last_name} — {ou.status}
                      </Text>
                      <Text className="text-muted-foreground">
                        Owes ${ou.amount_owed}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </PageWithHeader>
  );
}
