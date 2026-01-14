import { useState } from "react";
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
import { Link, router } from "expo-router";
import { Input } from "@/components/common/input";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function GroupsTab() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    // Get current user
    const currentUser = useQuery(api.users.getCurrentUser);
    const userId = currentUser?._id;

    // Get orders with user details for avatars
    const data = useQuery(api.orders.getWithDetails);
    const isPending = data === undefined;

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

    return (
        <PageWithHeader title="Groups">
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
                        {!isPending && filteredOrders && (
                            <>
                                {filteredOrders.map((item) => {
                                    const orderUsers = item.orderUsers.map((ou) => ({
                                        id: ou.id,
                                        firstName: ou.user?.firstName,
                                        lastName: ou.user?.lastName,
                                        avatarUrl: ou.user?.avatarUrl,
                                    }));

                                    return item.order.status === "active" ? (
                                        <Link
                                            href={`/order/${item.order.id}`}
                                            key={item.order.id}
                                            asChild>
                                            <Pressable>
                                                <OrderCard
                                                    id={item.order.id}
                                                    name={item.order.name}
                                                    comments={item.order.comments}
                                                    status={item.order.status}
                                                    paused={item.order.paused}
                                                    createdAt={item.order.createdAt}
                                                    orderUsers={orderUsers}
                                                />
                                            </Pressable>
                                        </Link>
                                    ) : (
                                        <OrderCard
                                            key={item.order.id}
                                            id={item.order.id}
                                            name={item.order.name}
                                            comments={item.order.comments}
                                            status={item.order.status}
                                            paused={item.order.paused}
                                            createdAt={item.order.createdAt}
                                            orderUsers={orderUsers}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </PageWithHeader>
    );
}
