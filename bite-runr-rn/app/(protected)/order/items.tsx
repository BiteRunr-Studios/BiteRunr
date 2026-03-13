import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

function normalizeOrderItems(items: string[]) {
    return items.map((item) => item.trim()).filter(Boolean);
}

function areOrderItemsEqual(left: string[], right: string[]) {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((item, index) => item === right[index]);
}

export default function WriteOrder() {
    const { orderUserId, orderId } = useLocalSearchParams<{
        orderUserId?: string;
        orderId?: string;
    }>();
    const { colorScheme } = useColorScheme();
    const navigation = useNavigation();
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
        null,
    );
    const [currentItems, setCurrentItems] = useState<string[]>([]);
    const [loadedItems, setLoadedItems] = useState<string[]>([]);
    const [itemInput, setItemInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const leaveInFlightRef = useRef(false);
    const isMountedRef = useRef(true);

    const orderLocations = useQuery(
        api.orderLocations.listForOrder,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );
    const replaceForUserLocation = useMutation(
        api.orderItems.replaceForUserLocation,
    );
    const setStatus = useMutation(api.orderUsers.setStatus);

    const selectedLocation = useMemo(() => {
        if (!orderLocations || orderLocations.length === 0) {
            return null;
        }

        return (
            orderLocations.find(
                (location) => location.id === selectedLocationId,
            ) ?? orderLocations[0]
        );
    }, [orderLocations, selectedLocationId]);

    const locationEntries = useQuery(
        api.orderItems.getForUserLocation,
        orderUserId && selectedLocation
            ? {
                  orderUserId: orderUserId as Id<"orderUsers">,
                  orderLocationId: selectedLocation.id as Id<"orderLocations">,
              }
            : "skip",
    );

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!selectedLocation || locationEntries === undefined) {
            return;
        }

        const nextItems = normalizeOrderItems(
            locationEntries.entries.map((entry) => entry.text),
        );
        setCurrentItems(nextItems);
        setLoadedItems(nextItems);
        setItemInput("");
    }, [selectedLocation?.id, locationEntries]);

    const saveCurrentLocation = useCallback(
        async ({ background = false }: { background?: boolean } = {}) => {
            if (!selectedLocation || !orderUserId) {
                return true;
            }

            const normalizedCurrentItems = normalizeOrderItems([
                ...currentItems,
                itemInput,
            ]);
            const normalizedLoadedItems = normalizeOrderItems(loadedItems);
            if (
                areOrderItemsEqual(
                    normalizedCurrentItems,
                    normalizedLoadedItems,
                )
            ) {
                return true;
            }

            if (!background && isMountedRef.current) {
                setIsSaving(true);
            }
            if (isMountedRef.current) {
                setSaveError(null);
            }

            try {
                await replaceForUserLocation({
                    orderUserId: orderUserId as Id<"orderUsers">,
                    orderLocationId:
                        selectedLocation.id as Id<"orderLocations">,
                    text: normalizedCurrentItems.join("\n"),
                });

                if (isMountedRef.current) {
                    setCurrentItems(normalizedCurrentItems);
                    setLoadedItems(normalizedCurrentItems);
                    setItemInput("");
                }
                return true;
            } catch (error: any) {
                const message =
                    error?.message ??
                    "We couldn't save your order. Please try again.";
                if (isMountedRef.current) {
                    setSaveError(message);
                }
                if (background) {
                    Toast.show({
                        type: "error",
                        text1: "Couldn't save your order",
                        text2: message,
                        visibilityTime: 4000,
                    });
                } else {
                    Alert.alert("Couldn't save order", message);
                }
                return false;
            } finally {
                if (!background && isMountedRef.current) {
                    setIsSaving(false);
                }
            }
        },
        [
            currentItems,
            itemInput,
            loadedItems,
            orderUserId,
            replaceForUserLocation,
            selectedLocation,
        ],
    );

    const completeOrder = useCallback(
        async ({ background = false }: { background?: boolean } = {}) => {
            if (!orderId) {
                return false;
            }

            try {
                await setStatus({
                    orderId: orderId as Id<"orders">,
                    status: "done",
                });
                return true;
            } catch (error: any) {
                const message =
                    error?.message ??
                    "We couldn't finish your order. Please try again.";
                if (isMountedRef.current) {
                    setSaveError(message);
                }
                if (background) {
                    Toast.show({
                        type: "error",
                        text1: "Couldn't finish ordering",
                        text2: message,
                        visibilityTime: 4000,
                    });
                } else {
                    Alert.alert("Couldn't finish ordering", message);
                }
                return false;
            }
        },
        [orderId, setStatus],
    );

    const queueBackgroundExitPersist = useCallback(() => {
        if (leaveInFlightRef.current) {
            return;
        }

        leaveInFlightRef.current = true;

        void (async () => {
            const didSave = await saveCurrentLocation({ background: true });
            if (didSave) {
                await completeOrder({ background: true });
            }
            leaveInFlightRef.current = false;
        })();
    }, [completeOrder, saveCurrentLocation]);

    const finishOrderingAndLeave = useCallback(() => {
        queueBackgroundExitPersist();
        router.dismiss();
    }, [queueBackgroundExitPersist]);

    const addItem = useCallback(() => {
        const nextItem = itemInput.trim();
        if (!nextItem) {
            return;
        }

        setCurrentItems((prev) => [...prev, nextItem]);
        setItemInput("");
        setSaveError(null);
    }, [itemInput]);

    const removeItem = useCallback((itemIndex: number) => {
        setCurrentItems((prev) =>
            prev.filter((_, index) => index !== itemIndex),
        );
        setSaveError(null);
    }, []);

    const handleLocationPress = useCallback(
        async (nextLocationId: string) => {
            if (selectedLocation?.id === nextLocationId || isSaving) {
                return;
            }

            const didSave = await saveCurrentLocation();
            if (!didSave) {
                return;
            }

            setCurrentItems([]);
            setLoadedItems([]);
            setItemInput("");
            setSelectedLocationId(nextLocationId);
        },
        [isSaving, saveCurrentLocation, selectedLocation?.id],
    );

    useEffect(() => {
        return navigation.addListener("beforeRemove", () => {
            queueBackgroundExitPersist();
        });
    }, [navigation, queueBackgroundExitPersist]);

    if (orderLocations === undefined) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator
                    size="large"
                    color={NAV_THEME[colorScheme].primary}
                />
            </View>
        );
    }

    const itemKeyCounts = new Map<string, number>();

    return (
        <>
            <SafeAreaView edges={["top"]} />
            <View className="flex-1 bg-background">
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <Text className="text-xl font-bold text-foreground">
                        Write Your Order
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                        {orderLocations.length === 1
                            ? "Add each item separately, including any modifiers."
                            : `Add each item under the right pickup location across ${orderLocations.length} pickup spots.`}
                    </Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="pt-4"
                        contentContainerStyle={{ gap: 8 }}>
                        {orderLocations.map((location) => {
                            const isSelected =
                                selectedLocation?.id === location.id;

                            return (
                                <Pressable
                                    key={location.id}
                                    onPress={() =>
                                        void handleLocationPress(location.id)
                                    }
                                    className={`flex-row items-center justify-center px-5 py-2 rounded-full ${
                                        isSelected ? "bg-primary" : "bg-muted"
                                    }`}>
                                    <Text
                                        className={`text-sm ${
                                            isSelected
                                                ? "text-white"
                                                : "text-muted-foreground"
                                        }`}>
                                        {location.name}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                {saveError ? (
                    <View className="flex-row gap-2 items-center px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
                        <Icon name="CircleAlert" size={18} color="#ef4444" />
                        <Text className="flex-1 text-sm text-destructive">
                            {saveError}
                        </Text>
                        <Pressable onPress={() => setSaveError(null)}>
                            <Icon name="X" size={16} color="#ef4444" />
                        </Pressable>
                    </View>
                ) : null}

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    className="flex-1">
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{
                            padding: 16,
                            paddingBottom: 40,
                        }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                        <View className="p-4 rounded-2xl border border-muted bg-card">
                            <View className="flex-row gap-2 items-center mb-3">
                                <View className="justify-center items-center w-8 h-8 rounded-lg bg-primary/10">
                                    <Icon
                                        name="MapPin"
                                        size={16}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-foreground">
                                        Add items one at a time
                                    </Text>
                                    <Text className="text-xs text-muted-foreground">
                                        Include sizes, modifiers, or special
                                        requests in each line.
                                    </Text>
                                </View>
                                {isSaving ? (
                                    <View className="flex-row gap-2 items-center">
                                        <ActivityIndicator
                                            size="small"
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                        <Text className="text-xs font-medium text-primary">
                                            Saving
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {locationEntries === undefined &&
                            selectedLocation ? (
                                <View className="justify-center items-center py-12">
                                    <ActivityIndicator
                                        size="large"
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                            ) : (
                                <View className="gap-3">
                                    <View className="flex-row gap-2 items-center">
                                        <View className="flex-1">
                                            <Input
                                                value={itemInput}
                                                placeholder="Add an item"
                                                errorMessage={null}
                                                inputClassName="flex-1 h-full text-base font-regular text-foreground placeholder:text-muted-foreground"
                                                onChangeText={(text) => {
                                                    setItemInput(text);
                                                    if (saveError) {
                                                        setSaveError(null);
                                                    }
                                                }}
                                                autoCapitalize="sentences"
                                                returnKeyType="done"
                                                blurOnSubmit={false}
                                                onSubmitEditing={addItem}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            onPress={addItem}
                                            disabled={isSaving}
                                            className={`flex-row items-center justify-center min-w-[96px] h-[55px] px-4 rounded-xl gap-2 ${
                                                isSaving
                                                    ? "bg-primary/50"
                                                    : "bg-primary"
                                            }`}>
                                            <Icon
                                                name="Plus"
                                                size={18}
                                                color="white"
                                            />
                                            <Text className="text-sm font-semibold text-white">
                                                Add
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text className="text-xs text-muted-foreground">
                                        Use one line per item so the summary
                                        stays easy to scan.
                                    </Text>

                                    {currentItems.length > 0 ? (
                                        <View className="gap-2">
                                            {currentItems.map((item, index) => {
                                                const occurrence =
                                                    itemKeyCounts.get(item) ??
                                                    0;
                                                itemKeyCounts.set(
                                                    item,
                                                    occurrence + 1,
                                                );

                                                return (
                                                    <View
                                                        key={`${selectedLocation?.id ?? "location"}-${item}-${occurrence}`}
                                                        className="flex-row gap-3 items-center p-3 rounded-xl border border-muted bg-background">
                                                        <View className="justify-center items-center w-7 h-7 rounded-full bg-primary/10">
                                                            <Text className="text-xs font-semibold text-primary">
                                                                {index + 1}
                                                            </Text>
                                                        </View>
                                                        <Text className="flex-1 text-sm text-foreground">
                                                            {item}
                                                        </Text>
                                                        <View className="justify-center items-center self-center">
                                                            <Pressable
                                                                onPress={() =>
                                                                    removeItem(
                                                                        index,
                                                                    )
                                                                }
                                                                hitSlop={10}
                                                                accessibilityRole="button"
                                                                accessibilityLabel="Remove item"
                                                                className="justify-center items-center w-9 h-9 rounded-full border border-destructive/20 bg-destructive/10 active:opacity-70">
                                                                <Icon
                                                                    name="Trash2"
                                                                    size={16}
                                                                    color={
                                                                        NAV_THEME[
                                                                            colorScheme
                                                                        ]
                                                                            .notification
                                                                    }
                                                                />
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <View className="justify-center items-center py-6 rounded-xl border border-dashed border-muted">
                                            <Text className="text-sm text-muted-foreground">
                                                No items added for this location
                                                yet
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    <TouchableOpacity
                        className="items-center justify-center w-full h-[55px] rounded-xl bg-primary"
                        onPress={finishOrderingAndLeave}>
                        <Text className="text-base font-semibold text-center text-white">
                            I'm Done Ordering
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
}
