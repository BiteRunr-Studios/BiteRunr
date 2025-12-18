import { getOrderLocationsForItemSelection } from "@/api/order/orderLocations";
import { getOrderUserLocationItems } from "@/api/order/orderUserLocationItems";
import { setOrderUserStatus } from "@/api/order/setOrderUserStatus";
import { searchItems } from "@/api/order/searchItems";
import {
    SelectItemsOrderLocationDTO,
    SelectItemsOrderUserLocationItemDTO,
    SelectItemsItemDTO,
} from "@/lib/types";
import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectItems() {
    const { orderUserId, orderId } = useLocalSearchParams();
    const [selectedLocation, setSelectedLocation] =
        useState<SelectItemsOrderLocationDTO | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const isFocused = useIsFocused();

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const {
        data: orderLocations,
        isPending: isOrderLocationsPending,
        isError: isOrderLocationsError,
        error: orderLocationsError,
    } = useQuery<SelectItemsOrderLocationDTO[]>({
        queryKey: ["orderLocations", orderId],
        queryFn: () => getOrderLocationsForItemSelection(orderId as string),
        enabled: isFocused,
    });

    const {
        data: orderUserLocationItems,
        isPending: isItemsPending,
        isError: isItemsError,
        error: itemsError,
    } = useQuery<SelectItemsOrderUserLocationItemDTO[]>({
        queryKey: [
            "orderUserLocationItems",
            orderUserId,
            selectedLocation?.location_id,
        ],
        queryFn: () =>
            getOrderUserLocationItems(
                orderUserId as string,
                selectedLocation?.order_location_id as string
            ),
        enabled:
            !!selectedLocation &&
            !isOrderLocationsPending &&
            isFocused &&
            !searchQuery,
    });

    const { data: searchResults, isPending: isSearchPending } = useQuery<
        SelectItemsItemDTO[]
    >({
        queryKey: [
            "searchItems",
            selectedLocation?.location_id,
            debouncedSearchQuery,
        ],
        queryFn: () =>
            searchItems(
                selectedLocation?.location_id as string,
                debouncedSearchQuery
            ),
        enabled:
            !!selectedLocation &&
            !isOrderLocationsPending &&
            isFocused &&
            debouncedSearchQuery.length > 0,
    });

    useEffect(() => {
        if (
            orderLocations &&
            orderLocations.length > 0 &&
            !selectedLocation?.location_id
        ) {
            setSelectedLocation(orderLocations[0]);
        }
    }, [orderLocations, selectedLocation?.location_id]);

    function handleDone() {
        setOrderUserStatus(orderId as string, "done");
        router.dismiss();
    }

    return (
        <>
            <SafeAreaView edges={["top"]}></SafeAreaView>
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <Text className="text-xl font-bold text-foreground">
                        Select Items
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                        {orderLocations?.length
                            ? orderLocations?.length == 1
                                ? "Choose from 1 location"
                                : `Choose from ${orderLocations?.length} locations`
                            : "No locations found"}
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="pt-4"
                        contentContainerStyle={{ gap: 8 }}>
                        {orderLocations?.map((item) => (
                            <Pressable
                                key={item.location_id}
                                onPress={() => setSelectedLocation(item)}
                                className={`flex-row items-center justify-center px-8 py-2 rounded-full ${
                                    selectedLocation?.location_id ===
                                    item.location_id
                                        ? "bg-primary"
                                        : "bg-muted"
                                }`}>
                                <Text
                                    className={`text ${
                                        selectedLocation?.location_id ===
                                        item.location_id
                                            ? "text-white"
                                            : "text-muted-foreground"
                                    }`}>
                                    {item.location_name}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Main Content */}
                <View className="px-4 pt-4 pb-3">
                    <View className="flex-row items-center px-3 border rounded-lg border-input bg-background">
                        <TextInput
                            className="flex-1 py-2 text-foreground"
                            placeholder="Search..."
                            placeholderTextColor="hsl(215.4 16.3% 46.9%)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>
                <View className="flex-1 px-4 py-2 bg-background">
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}>
                        {searchQuery ? (
                            // Search results
                            searchResults && searchResults.length > 0 ? (
                                searchResults.map((item, idx) => (
                                    <View
                                        key={idx}
                                        className="flex-row justify-between w-full gap-2 p-4 border rounded-2xl border-muted bg-card">
                                        <View className="flex-row justify-between gap-2">
                                            <View className="flex items-center justify-center w-12 h-12 rounded-full bg-muted-foreground"></View>
                                            <View className="flex-col">
                                                <Text className="text-lg">
                                                    {item.name}
                                                </Text>
                                                <Text className="text-muted-foreground">
                                                    From{" "}
                                                    {
                                                        selectedLocation?.location_name
                                                    }
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            ) : isSearchPending ? null : (
                                <Text className="text-center text-muted-foreground">
                                    None found
                                </Text>
                            )
                        ) : (
                            // Order user location items
                            orderUserLocationItems?.map(
                                (orderUserLocationItem, idx) => (
                                    <View
                                        key={idx}
                                        className="flex-row justify-between w-full gap-2 p-4 border rounded-2xl border-muted bg-card">
                                        <View className="flex-row justify-between gap-2">
                                            <View className="flex items-center justify-center w-12 h-12 rounded-full bg-muted-foreground"></View>
                                            <View className="flex-col">
                                                <Text className="text-lg">
                                                    {
                                                        orderUserLocationItem
                                                            .item.name
                                                    }
                                                </Text>
                                                <Text className="text-muted-foreground">
                                                    From{" "}
                                                    {
                                                        selectedLocation?.location_name
                                                    }
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="flex-row items-center justify-center gap-2">
                                            <Text className="text-lg">
                                                x
                                                {orderUserLocationItem.quantity}
                                            </Text>
                                        </View>
                                    </View>
                                )
                            )
                        )}
                    </ScrollView>
                </View>

                {/* Footer - Fixed at bottom */}
                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    <View className="flex-col gap-2">
                        <TouchableOpacity
                            className="w-full py-3 bg-green-500 rounded-lg"
                            onPress={handleDone}>
                            <Text className="text-sm font-semibold text-center text-white">
                                I'm Done Ordering
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </>
    );
}
