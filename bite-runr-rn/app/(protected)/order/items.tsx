import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
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
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type OrderLocation = {
    locationId: Id<"locations">;
    orderLocationId: Id<"orderLocations">;
    locationName: string;
};

type OrderUserLocationItem = {
    id: Id<"orderItems">;
    orderLocationId: Id<"orderLocations">;
    orderUserId: Id<"orderUsers">;
    itemId: Id<"items">;
    comments: string | undefined;
    quantity: number;
    createdAt: number;
    item: {
        id: Id<"items">;
        name: string;
        locationId: Id<"locations">;
        createdAt: number;
    } | null;
};

export default function SelectItems() {
    const { orderUserId, orderId } = useLocalSearchParams();
    const [selectedLocation, setSelectedLocation] =
        useState<OrderLocation | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [addSheetVisible, setAddSheetVisible] = useState(false);
    const [editSheetVisible, setEditSheetVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{
        name: string;
        id: string;
    } | null>(null);
    const [selectedOrderUserLocationItem, setSelectedOrderUserLocationItem] =
        useState<OrderUserLocationItem | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Queries
    const orderLocations = useQuery(
        api.orderLocations.listForOrder,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip"
    );
    const isOrderLocationsPending = orderLocations === undefined;

    const orderUserLocationItems = useQuery(
        api.orderItems.listForUserLocation,
        orderUserId && selectedLocation && !searchQuery
            ? {
                  orderUserId: orderUserId as Id<"orderUsers">,
                  orderLocationId: selectedLocation.orderLocationId,
              }
            : "skip"
    );
    const isItemsPending = orderUserLocationItems === undefined;

    const searchResults = useQuery(
        api.items.search,
        selectedLocation && debouncedSearchQuery.length > 0
            ? {
                  locationId: selectedLocation.locationId,
                  query: debouncedSearchQuery,
              }
            : "skip"
    );
    const isSearchPending = searchResults === undefined;

    // Mutations
    const setStatus = useMutation(api.orderUsers.setStatus);
    const removeItem = useMutation(api.orderItems.remove);

    useEffect(() => {
        if (
            orderLocations &&
            orderLocations.length > 0 &&
            !selectedLocation?.locationId
        ) {
            setSelectedLocation(orderLocations[0]);
        }
    }, [orderLocations, selectedLocation?.locationId]);

    async function handleDone() {
        try {
            await setStatus({
                orderId: orderId as Id<"orders">,
                status: "done",
            });
            router.dismiss();
        } catch (error) {
            console.error("Failed to set status:", error);
        }
    }

    function handleSearchItemPress(item: { name: string; id: string }) {
        setSelectedItem(item);
        setAddSheetVisible(true);
    }

    function handleExistingItemPress(
        orderUserLocationItem: OrderUserLocationItem
    ) {
        setSelectedOrderUserLocationItem(orderUserLocationItem);
        setEditSheetVisible(true);
    }

    function handleAddItem() {
        // Convex will automatically update the UI
        setSearchQuery("");
        setAddSheetVisible(false);
    }

    function handleUpdateItem() {
        // Convex will automatically update the UI
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
            await removeItem({
                orderItemId: orderItemId as Id<"orderItems">,
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
                                key={item.locationId}
                                onPress={() => setSelectedLocation(item)}
                                className={`flex-row items-center justify-center px-8 py-2 rounded-full ${
                                    selectedLocation?.locationId ===
                                    item.locationId
                                        ? "bg-primary"
                                        : "bg-muted"
                                }`}>
                                <Text
                                    className={`text ${
                                        selectedLocation?.locationId ===
                                        item.locationId
                                            ? "text-white"
                                            : "text-muted-foreground"
                                    }`}>
                                    {item.locationName}
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
                                                id: item._id,
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
                                                        selectedLocation?.locationName
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
                                            orderUserLocationItem.item?.name ??
                                                "this item"
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
                                                                .item?.name
                                                        }
                                                    </Text>
                                                    <Text className="text-muted-foreground">
                                                        From{" "}
                                                        {
                                                            selectedLocation?.locationName
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
                locationName={selectedLocation?.locationName || ""}
                itemId={selectedItem?.id || ""}
                orderUserId={orderUserId as string}
                orderLocationId={selectedLocation?.orderLocationId || ""}
            />

            {/* Edit Item Sheet */}
            <EditItemSheet
                visible={editSheetVisible}
                onClose={handleCloseEditSheet}
                onUpdate={handleUpdateItem}
                itemName={selectedOrderUserLocationItem?.item?.name || ""}
                locationName={selectedLocation?.locationName || ""}
                orderItemId={selectedOrderUserLocationItem?.id || ""}
                initialQuantity={selectedOrderUserLocationItem?.quantity || 1}
                initialComments={
                    selectedOrderUserLocationItem?.comments || null
                }
            />
        </>
    );
}
