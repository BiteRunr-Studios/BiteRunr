import { getOrderLocationsForItemSelection } from "@/api/order/orderLocations";
import { getOrderUserLocationItems } from "@/api/order/orderUserLocationItems";
import { setOrderUserStatus } from "@/api/order/setOrderUserStatus";
import { searchItems } from "@/api/order/searchItems";
import { deleteOrderItem } from "@/api/order/deleteOrderItem";
import {
    SelectItemsOrderLocationDTO,
    SelectItemsOrderUserLocationItemDTO,
    SelectItemsItemDTO,
} from "@/lib/types";
import { useIsFocused } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    TouchableOpacity,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddItemSheet } from "@/components/add-item-sheet";
import { EditItemSheet } from "@/components/edit-item-sheet";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
    useAnimatedStyle,
    interpolate,
    SharedValue,
    Extrapolation,
} from "react-native-reanimated";
import { Input } from "@/components/common/input";

export default function SelectItems() {
    const { orderUserId, orderId } = useLocalSearchParams();
    const queryClient = useQueryClient();
    const [selectedLocation, setSelectedLocation] =
        useState<SelectItemsOrderLocationDTO | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [addSheetVisible, setAddSheetVisible] = useState(false);
    const [editSheetVisible, setEditSheetVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
        name: string;
        id: string;
    } | null>(null);
    const [selectedOrderUserLocationItem, setSelectedOrderUserLocationItem] =
        useState<SelectItemsOrderUserLocationItemDTO | null>(null);
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
        setOrderUserStatus(orderId as string, { status: "done" });
        router.dismiss();
    }

    function handleSearchItemPress(item: { name: string; id: string }) {
        setSelectedItem(item);
        setAddSheetVisible(true);
    }

    function handleExistingItemPress(
        orderUserLocationItem: SelectItemsOrderUserLocationItemDTO
    ) {
        setSelectedOrderUserLocationItem(orderUserLocationItem);
        setEditSheetVisible(true);
    }

    function handleAddItem() {
        // Refetch the order user location items after adding
        queryClient.invalidateQueries({
            queryKey: [
                "orderUserLocationItems",
                orderUserId,
                selectedLocation?.location_id,
            ],
        });
        setSearchQuery("");
        setAddSheetVisible(false);
    }

    function handleUpdateItem() {
        // Refetch the order user location items after updating
        queryClient.invalidateQueries({
            queryKey: [
                "orderUserLocationItems",
                orderUserId,
                selectedLocation?.location_id,
            ],
        });
        setEditSheetVisible(false);
    }

    function handleCloseAddSheet() {
        setAddSheetVisible(false);
        setSelectedItem(null);
    }

    function handleCloseEditSheet() {
        setEditSheetVisible(false);
        setSelectedOrderUserLocationItem(null);
    }

    async function handleDeleteItem(orderItemId: string) {
        try {
            await deleteOrderItem(orderItemId);
            // Refetch the order user location items after deleting
            queryClient.invalidateQueries({
                queryKey: [
                    "orderUserLocationItems",
                    orderUserId,
                    selectedLocation?.location_id,
                ],
            });
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    }

    function confirmDelete(
        orderItemId: string,
        itemName: string,
        swipeable: any
    ) {
        Alert.alert(
            "Delete Item",
            `Are you sure you want to delete ${itemName}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => swipeable.close(),
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        handleDeleteItem(orderItemId);
                        swipeable.close();
                    },
                },
            ]
        );
    }

    function RightAction({
        progress,
        orderItemId,
        itemName,
        swipeable,
    }: {
        progress: SharedValue<number>;
        orderItemId: string;
        itemName: string;
        swipeable: any;
    }) {
        const animatedStyle = useAnimatedStyle(() => {
            const scale = interpolate(
                progress.value,
                [0, 1],
                [0.5, 1],
                Extrapolation.CLAMP
            );
            const opacity = interpolate(
                progress.value,
                [0, 0.5, 1],
                [0, 0.5, 1],
                Extrapolation.CLAMP
            );

            return {
                transform: [{ scale }],
                opacity,
            };
        });

        return (
            <View className="justify-center pl-4">
                <Animated.View style={animatedStyle}>
                    <TouchableOpacity
                        onPress={() =>
                            confirmDelete(orderItemId, itemName, swipeable)
                        }
                        className="items-center justify-center w-16 h-16 bg-red-500 rounded-full"
                        activeOpacity={0.7}>
                        <Text className="text-2xl font-bold text-white">×</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    const renderRightActions = useCallback(
        (orderItemId: string, itemName: string) => {
            return (
                progress: SharedValue<number>,
                _drag: SharedValue<number>,
                swipeable: any
            ) => (
                <RightAction
                    progress={progress}
                    orderItemId={orderItemId}
                    itemName={itemName}
                    swipeable={swipeable}
                />
            );
        },
        []
    );

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
                <View className="px-4 pt-4 pb-2">
                    <Input
                        value={searchQuery}
                        placeholder="Search"
                        leftIcon="Search"
                        autoCapitalize="none"
                        returnKeyType="search"
                        errorMessage=""
                        onChangeText={setSearchQuery}
                    />
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
                                    <Pressable
                                        key={idx}
                                        onPress={() =>
                                            handleSearchItemPress({
                                                name: item.name,
                                                id: item.id,
                                            })
                                        }
                                        className="flex-row justify-between w-full gap-2 p-4 border rounded-2xl border-muted bg-card active:opacity-70">
                                        <View className="flex-row justify-between gap-2">
                                            <View className="flex items-center justify-center w-12 h-12 rounded-full bg-muted-foreground"></View>
                                            <View className="flex-col">
                                                <Text className="text-lg text-white">
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
                                    </Pressable>
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
                                    <Swipeable
                                        key={idx}
                                        renderRightActions={renderRightActions(
                                            orderUserLocationItem.id,
                                            orderUserLocationItem.item.name
                                        )}>
                                        <Pressable
                                            onPress={() =>
                                                handleExistingItemPress(
                                                    orderUserLocationItem
                                                )
                                            }
                                            className="flex-row justify-between w-full gap-2 p-4 border rounded-2xl border-muted bg-card active:opacity-70">
                                            <View className="flex-row justify-between gap-2">
                                                <View className="flex items-center justify-center w-12 h-12 rounded-full bg-muted-foreground"></View>
                                                <View className="flex-col">
                                                    <Text className="text-lg text-white">
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
                                                <Text className="text-lg text-white">
                                                    x
                                                    {
                                                        orderUserLocationItem.quantity
                                                    }
                                                </Text>
                                            </View>
                                        </Pressable>
                                    </Swipeable>
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

            {/* Add Item Sheet */}
            <AddItemSheet
                visible={addSheetVisible}
                onClose={handleCloseAddSheet}
                onAdd={handleAddItem}
                itemName={selectedItem?.name || ""}
                locationName={selectedLocation?.location_name || ""}
                itemId={selectedItem?.id || ""}
                orderUserId={orderUserId as string}
                orderLocationId={selectedLocation?.order_location_id || ""}
            />

            {/* Edit Item Sheet */}
            <EditItemSheet
                visible={editSheetVisible}
                onClose={handleCloseEditSheet}
                onUpdate={handleUpdateItem}
                itemName={selectedOrderUserLocationItem?.item.name || ""}
                locationName={selectedLocation?.location_name || ""}
                orderItemId={selectedOrderUserLocationItem?.id || ""}
                initialQuantity={selectedOrderUserLocationItem?.quantity || 1}
                initialComments={
                    selectedOrderUserLocationItem?.comments || null
                }
            />
        </>
    );
}
