import { useState, useEffect } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { PageWithHeader } from "@/components/layout/page-with-header";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { OrderCard } from "@/components/order-card";
import { Order, OrderStatus } from "@/lib/types";
import { getOrders } from "@/api/groups/orders";
import { useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useIsFocused } from "@react-navigation/native";
import { Input } from "@/components/common/input";

export default function GroupsTab() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
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

        // Filter by creator (Created by me vs Invited to)
        const matchesCreator =
            selectedIndex === 0
                ? order.creator_id === userId
                : order.creator_id !== userId;

        if (!matchesCreator) return false;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const orderName = order.name?.toLowerCase() || "";
            const orderComments = order.comments?.toLowerCase() || "";
            const creatorFirstName =
                order.creator?.profile?.first_name?.toLowerCase() || "";
            const creatorLastName =
                order.creator?.profile?.last_name?.toLowerCase() || "";
            const creatorFullName =
                `${creatorFirstName} ${creatorLastName}`.trim();

            const matchesSearch =
                orderName.includes(query) ||
                orderComments.includes(query) ||
                creatorFirstName.includes(query) ||
                creatorLastName.includes(query) ||
                creatorFullName.includes(query);

            return matchesSearch;
        }

        return true;
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

                    <View className="mt-4 mb-2">
                        <Input
                            value={searchQuery}
                            placeholder="Search"
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

                    <ScrollView
                        className="flex-1 pt-2"
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
