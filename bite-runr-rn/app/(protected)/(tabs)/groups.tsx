import { useState, useEffect } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { PageWithHeader } from "@/components/layout/page-with-header";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Feather } from "@expo/vector-icons";
import { OrderCard } from "@/components/order-card";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Order, OrderStatus } from "@/lib/types";
import { getOrders } from "@/api/groups/orders";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useIsFocused } from "@react-navigation/native";

export default function GroupsTab() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const { isDarkColorScheme } = useColorScheme();
    const isFocused = useIsFocused();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id ?? null);
        });
    }, []);

    const { data, isPending, isError, error } = useQuery<Order[]>({
        queryKey: ["userOrders"],
        queryFn: getOrders,
        enabled: isFocused,
        refetchInterval: isFocused ? 2_500 : false,
    });

    const filteredOrders = data?.filter((order) => {
        if (!userId) return false;

        if (selectedIndex === 0) {
            // "Created by me" - show only orders where user is the creator
            return order.creator_id === userId;
        } else {
            // "Invited to" - show only orders where user is NOT the creator
            return order.creator_id !== userId;
        }
    });

    return (
        <PageWithHeader title="Account">
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
                        <Link href={`/order/create`} asChild>
                            <Pressable>
                                <Feather
                                    name="plus-circle"
                                    size={24}
                                    color={"hsl(32 100% 50%)"}
                                />
                            </Pressable>
                        </Link>
                    </View>

                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}>
                        {isPending && (
                            <View className="mt-6">
                                <ActivityIndicator />
                                <Text className="mt-2 text-muted-foreground">
                                    Loading orders...
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
                        {!isPending && !isError && filteredOrders && (
                            <>
                                {filteredOrders.map((order: Order) =>
                                    order.status === OrderStatus.Active ? (
                                        <Link
                                            href={`/order/${order.id}`}
                                            key={order.id}
                                            asChild>
                                            <Pressable>
                                                <OrderCard {...order} />
                                            </Pressable>
                                        </Link>
                                    ) : (
                                        <OrderCard key={order.id} {...order} />
                                    )
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </PageWithHeader>
    );
}
