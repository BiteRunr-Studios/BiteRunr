import { useState, useEffect } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { PageWithHeader } from "@/components/page-with-header";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Feather } from "@expo/vector-icons";
import { OrderCard } from "@/components/order-card";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Order } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getOrders } from "@/api/groups/orders";
import { useQuery } from "@tanstack/react-query";

export default function GroupsTab() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { isDarkColorScheme } = useColorScheme();

    const { data, isPending, isError, error } = useQuery<Order[]>({
        queryKey: ["userOrders"],
        queryFn: getOrders,
    });

    return (
        <PageWithHeader
            title="Account"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}>
            <View className="flex-1 px-6">
                <View className="flex-1 py-2">
                    <SegmentedControl
                        values={["Created by me", "Invited to"]}
                        tintColor="hsla(32, 100%, 50%, 0.2)"
                        selectedIndex={selectedIndex}
                        activeFontStyle={{ color: "hsl(32, 100%, 50%)" }}
                        onChange={(event) => {
                            setSelectedIndex(
                                event.nativeEvent.selectedSegmentIndex
                            );
                        }}
                    />
                    <View className="flex-row items-center px-4 my-4 border rounded-2xl border-muted">
                        <Feather
                            name="search"
                            size={24}
                            color={
                                isDarkColorScheme
                                    ? NAV_THEME.dark.foreground
                                    : NAV_THEME.light.foreground
                            }
                        />
                        <TextInput
                            autoCorrect={false}
                            placeholder="Search"
                            className="flex-1 px-2 py-4 text-foreground"
                        />
                        <Feather
                            name="plus-circle"
                            size={24}
                            color={"hsl(32 100% 50%)"}
                        />
                    </View>

                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}>
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
                                    {(error as Error)?.message ??
                                        "Unknown error"}
                                </Text>
                            </View>
                        )}
                        {!isPending && !isError && data && (
                            <>
                                {data.map((order: Order) => (
                                    <OrderCard key={order.id} {...order} />
                                ))}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </PageWithHeader>
    );
}
