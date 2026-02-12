import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
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
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
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
    const { colorScheme } = useColorScheme();

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

    const allLocationItems = useQuery(
        api.items.listByLocation,
        selectedLocation && !searchQuery
            ? { locationId: selectedLocation.locationId }
            : "skip"
    );

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
                        className="items-center justify-center w-16 h-16 rounded-full"
                        style={{ backgroundColor: "hsl(0, 84%, 60%)" }}
                        activeOpacity={0.7}>
                        <Icon name="Trash2" size={22} color="white" />
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
                                    className={`text-sm ${
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
                            searchQuery !== debouncedSearchQuery || (isSearchPending && debouncedSearchQuery.length > 0) ? (
                                <View className="items-center justify-center py-12">
                                    <ActivityIndicator
                                        size="large"
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                            ) : searchResults && searchResults.length > 0 ? (
                                searchResults.map((item, idx) => (
                                    <Pressable
                                        key={idx}
                                        onPress={() =>
                                            handleSearchItemPress({
                                                name: item.name,
                                                id: item._id,
                                            })
                                        }
                                        className="flex-row items-center w-full gap-3 p-4 border rounded-2xl border-muted bg-card active:opacity-70">
                                        <View className="items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                                            <Icon
                                                name="UtensilsCrossed"
                                                size={20}
                                                color={NAV_THEME[colorScheme].primary}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-lg text-foreground">
                                                {item.name}
                                            </Text>
                                            <Text className="text-sm text-muted-foreground">
                                                From{" "}
                                                {selectedLocation?.locationName}
                                            </Text>
                                        </View>
                                        <Icon
                                            name="Plus"
                                            size={20}
                                            color={NAV_THEME[colorScheme].primary}
                                        />
                                    </Pressable>
                                ))
                            ) : (
                                <View className="items-center justify-center py-12">
                                    <View className="items-center justify-center w-16 h-16 mb-3 rounded-2xl bg-muted">
                                        <Icon
                                            name="SearchX"
                                            size={28}
                                            color={NAV_THEME[colorScheme].border}
                                        />
                                    </View>
                                    <Text className="text-base font-medium text-muted-foreground">
                                        No items found
                                    </Text>
                                    <Text className="mt-1 text-sm text-muted-foreground">
                                        Try a different search term
                                    </Text>
                                </View>
                            )
                        ) : (
                            <>
                                {/* Your existing order items */}
                                {orderUserLocationItems && orderUserLocationItems.length > 0 && (
                                    <>
                                        <Text className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                                            Your Items
                                        </Text>
                                        {orderUserLocationItems.map(
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
                                                        className="flex-row items-center w-full gap-3 p-4 border rounded-2xl border-muted bg-card active:opacity-70">
                                                        <View className="items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                                                            <Icon
                                                                name="UtensilsCrossed"
                                                                size={20}
                                                                color={NAV_THEME[colorScheme].primary}
                                                            />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-lg text-foreground">
                                                                {orderUserLocationItem.item?.name}
                                                            </Text>
                                                            <Text className="text-sm text-muted-foreground">
                                                                From{" "}
                                                                {selectedLocation?.locationName}
                                                            </Text>
                                                        </View>
                                                        <View className="px-3 py-1 rounded-full bg-primary/20">
                                                            <Text className="text-sm font-semibold text-primary">
                                                                x{orderUserLocationItem.quantity}
                                                            </Text>
                                                        </View>
                                                    </Pressable>
                                                </Swipeable>
                                            )
                                        )}
                                    </>
                                )}

                                {/* All available items at this location */}
                                {allLocationItems === undefined ? (
                                    <View className="items-center justify-center py-12">
                                        <ActivityIndicator
                                            size="large"
                                            color={NAV_THEME[colorScheme].primary}
                                        />
                                    </View>
                                ) : allLocationItems.length > 0 ? (
                                    <>
                                        <Text className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                                            All Items
                                        </Text>
                                        {allLocationItems.map((item, idx) => (
                                            <Pressable
                                                key={idx}
                                                onPress={() =>
                                                    handleSearchItemPress({
                                                        name: item.name,
                                                        id: item._id,
                                                    })
                                                }
                                                className="flex-row items-center w-full gap-3 p-4 border rounded-2xl border-muted bg-card active:opacity-70">
                                                <View className="items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                                                    <Icon
                                                        name="UtensilsCrossed"
                                                        size={20}
                                                        color={NAV_THEME[colorScheme].primary}
                                                    />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-lg text-foreground">
                                                        {item.name}
                                                    </Text>
                                                    <Text className="text-sm text-muted-foreground">
                                                        From{" "}
                                                        {selectedLocation?.locationName}
                                                    </Text>
                                                </View>
                                                <Icon
                                                    name="Plus"
                                                    size={20}
                                                    color={NAV_THEME[colorScheme].primary}
                                                />
                                            </Pressable>
                                        ))}
                                    </>
                                ) : (
                                    <View className="items-center justify-center py-12">
                                        <View className="items-center justify-center w-16 h-16 mb-3 rounded-2xl bg-primary/10">
                                            <Icon
                                                name="ShoppingBag"
                                                size={28}
                                                color={NAV_THEME[colorScheme].primary}
                                            />
                                        </View>
                                        <Text className="text-base font-medium text-foreground">
                                            No items at this location
                                        </Text>
                                        <Text className="mt-1 text-sm text-muted-foreground">
                                            Search above to add a new item
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>

                {/* Footer - Fixed at bottom */}
                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    <View className="flex-col gap-2">
                        <TouchableOpacity
                            className="w-full py-3 rounded-xl bg-primary"
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
                onDelete={() => {
                    const id = selectedOrderUserLocationItem?.id;
                    handleCloseEditSheet();
                    if (id) handleDeleteItem(id);
                }}
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
