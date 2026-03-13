import type { NavigationAction } from "@react-navigation/routers";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

function normalizeOrderText(text: string) {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
}

type PendingExit =
    | { kind: "dismiss" }
    | { kind: "action"; action: NavigationAction };

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
    const [currentText, setCurrentText] = useState("");
    const [loadedText, setLoadedText] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [preventRemove, setPreventRemove] = useState(true);
    const [pendingExit, setPendingExit] = useState<PendingExit | null>(null);
    const leaveInFlightRef = useRef(false);

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
            orderLocations.find((location) => location.id === selectedLocationId) ??
            orderLocations[0]
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
        if (!selectedLocationId && orderLocations && orderLocations.length > 0) {
            setSelectedLocationId(orderLocations[0].id);
        }
    }, [orderLocations, selectedLocationId]);

    useEffect(() => {
        if (!selectedLocation) {
            setCurrentText("");
            setLoadedText("");
            return;
        }

        if (locationEntries === undefined) {
            return;
        }

        const nextText = locationEntries.text ?? "";
        setCurrentText(nextText);
        setLoadedText(nextText);
    }, [selectedLocation?.id, locationEntries]);

    const saveCurrentLocation = useCallback(async () => {
        if (!selectedLocation || !orderUserId) {
            return true;
        }

        const normalizedCurrentText = normalizeOrderText(currentText);
        const normalizedLoadedText = normalizeOrderText(loadedText);
        if (normalizedCurrentText === normalizedLoadedText) {
            return true;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            await replaceForUserLocation({
                orderUserId: orderUserId as Id<"orderUsers">,
                orderLocationId: selectedLocation.id as Id<"orderLocations">,
                text: currentText,
            });

            setCurrentText(normalizedCurrentText);
            setLoadedText(normalizedCurrentText);
            setIsSaving(false);
            return true;
        } catch (error: any) {
            const message =
                error?.message ?? "We couldn't save your order. Please try again.";
            setSaveError(message);
            Alert.alert("Couldn't save order", message);
            setIsSaving(false);
            return false;
        }
    }, [
        currentText,
        loadedText,
        orderUserId,
        replaceForUserLocation,
        selectedLocation,
    ]);

    const completeOrder = useCallback(async () => {
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
            setSaveError(message);
            Alert.alert("Couldn't finish ordering", message);
            return false;
        }
    }, [orderId, setStatus]);

    const requestExit = useCallback(
        async (nextExit: PendingExit) => {
            if (leaveInFlightRef.current || isSaving) {
                return;
            }

            leaveInFlightRef.current = true;

            const didSave = await saveCurrentLocation();
            if (!didSave) {
                leaveInFlightRef.current = false;
                return;
            }

            const didComplete = await completeOrder();
            if (!didComplete) {
                leaveInFlightRef.current = false;
                return;
            }

            setPendingExit(nextExit);
            setPreventRemove(false);
            leaveInFlightRef.current = false;
        },
        [completeOrder, isSaving, saveCurrentLocation],
    );

    const finishOrderingAndLeave = useCallback(() => {
        void requestExit({ kind: "dismiss" });
    }, [requestExit]);

    const handleLocationPress = useCallback(
        async (nextLocationId: string) => {
            if (selectedLocation?.id === nextLocationId || isSaving) {
                return;
            }

            const didSave = await saveCurrentLocation();
            if (!didSave) {
                return;
            }

            setCurrentText("");
            setLoadedText("");
            setSelectedLocationId(nextLocationId);
        },
        [isSaving, saveCurrentLocation, selectedLocation?.id],
    );

    useEffect(() => {
        if (preventRemove || !pendingExit) {
            return;
        }

        if (pendingExit.kind === "action") {
            const action = pendingExit.action;
            setPendingExit(null);
            navigation.dispatch(action);
            return;
        }

        setPendingExit(null);
        router.dismiss();
    }, [navigation, pendingExit, preventRemove]);

    usePreventRemove(preventRemove, ({ data }) => {
        void requestExit({ kind: "action", action: data.action });
    });

    if (orderLocations === undefined) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator
                    size="large"
                    color={NAV_THEME[colorScheme].primary}
                />
            </View>
        );
    }

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
                            ? "Write one item per line."
                            : `Write one item per line for each of the ${orderLocations.length} pickup locations.`}
                    </Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="pt-4"
                        contentContainerStyle={{ gap: 8 }}>
                        {orderLocations.map((location) => {
                            const isSelected = selectedLocation?.id === location.id;

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
                    <View className="flex-row items-center gap-2 px-4 py-3 mx-4 mt-4 rounded-xl bg-destructive/10">
                        <Icon name="CircleAlert" size={18} color="#ef4444" />
                        <Text className="flex-1 text-sm text-destructive">
                            {saveError}
                        </Text>
                        <Pressable onPress={() => setSaveError(null)}>
                            <Icon name="X" size={16} color="#ef4444" />
                        </Pressable>
                    </View>
                ) : null}

                <View className="flex-1 px-4 pt-4">
                    <View className="p-4 border rounded-2xl border-muted bg-card">
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                                <Icon
                                    name="MapPin"
                                    size={16}
                                    color={NAV_THEME[colorScheme].primary}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-muted-foreground">
                                    {selectedLocation?.name ?? "Pickup Location"}
                                </Text>
                                <Text className="text-xs text-muted-foreground">
                                    One item per line
                                </Text>
                            </View>
                            {isSaving ? (
                                <View className="flex-row items-center gap-2">
                                    <ActivityIndicator
                                        size="small"
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                    <Text className="text-xs font-medium text-primary">
                                        Saving
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {locationEntries === undefined && selectedLocation ? (
                            <View className="items-center justify-center py-12">
                                <ActivityIndicator
                                    size="large"
                                    color={NAV_THEME[colorScheme].primary}
                                />
                            </View>
                        ) : (
                            <TextInput
                                value={currentText}
                                onChangeText={setCurrentText}
                                placeholder={"Burger with no onions\nFries\nLarge iced tea"}
                                placeholderTextColor={NAV_THEME[colorScheme].border}
                                multiline
                                autoCapitalize="sentences"
                                textAlignVertical="top"
                                className="min-h-[280px] px-4 py-4 text-base border rounded-xl border-muted bg-background text-foreground"
                                style={{ minHeight: 280 }}
                            />
                        )}
                    </View>
                </View>

                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    <TouchableOpacity
                        className={`w-full py-3 rounded-xl ${
                            isSaving ? "bg-primary/50" : "bg-primary"
                        }`}
                        disabled={isSaving}
                        onPress={() => void finishOrderingAndLeave()}>
                        <Text className="text-sm font-semibold text-center text-white">
                            I'm Done Ordering
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
}
