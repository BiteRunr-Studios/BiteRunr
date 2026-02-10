import {
    ScrollView,
    Text,
    View,
    Image,
    TouchableOpacity,
    Animated,
    Alert,
    Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useColorScheme } from "@/lib/use-color-scheme";
import ReAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { NAV_THEME } from "@/lib/constants";
import Icon from "@/components/common/icon";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QRCodeModal } from "@/components/qr-code-modal";

type ButtonState = "readyToRun" | "enabled" | "disabled";

export default function SpecificOrder() {
    const { orderId } = useLocalSearchParams();
    const { colorScheme } = useColorScheme();
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const buttonTranslateY = useRef(new Animated.Value(20)).current;
    const [showQRModal, setShowQRModal] = useState(false);

    const breatheValue = useSharedValue(1);
    breatheValue.value = withRepeat(
        withSequence(
            withTiming(0.4, {
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
            }),
        ),
        -1,
        false,
    );

    const breatheStyle = useAnimatedStyle(() => ({
        opacity: breatheValue.value,
        transform: [{ scale: 0.8 + breatheValue.value * 0.2 }],
    }));

    // Get current user
    const currentUser = useQuery(api.users.getCurrentUser);
    const currentUserId = currentUser?._id;

    // Get order data
    const data = useQuery(
        api.orders.get,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );
    const isPending = data === undefined;

    // Mutations
    const setStatus = useMutation(api.orderUsers.setStatus);
    const updateOrder = useMutation(api.orders.update);

    const prevStatusRef = useRef<string | null>(null);

    useEffect(() => {
        if (
            data?.order.status === "cancelled" &&
            prevStatusRef.current !== null &&
            prevStatusRef.current !== "cancelled"
        ) {
            router.dismissAll();
        }
        prevStatusRef.current = data?.order.status ?? null;
    }, [data?.order.status]);

    const isCreator = currentUserId === data?.order.creatorId;

    useEffect(() => {
        if (isCreator) {
            Animated.parallel([
                Animated.timing(buttonOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonTranslateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isCreator, buttonOpacity, buttonTranslateY]);

    const getButtonState = (): ButtonState => {
        if (!data?.orderUsers || data.orderUsers.length === 0) {
            return "disabled";
        }

        const allDone = data.orderUsers.every((user) => user.status === "done");
        const someDone = data.orderUsers.some((user) => user.status === "done");

        if (allDone) {
            return "readyToRun";
        } else if (someDone) {
            return "enabled";
        } else {
            return "disabled";
        }
    };

    async function handleSelectItems() {
        const orderUser = data?.orderUsers.find(
            (x) => x.userId === currentUserId,
        );

        if (!orderUser) {
            Alert.alert("Error", "Unable to find your order participation.");
            return;
        }

        try {
            await setStatus({
                orderId: orderId as Id<"orders">,
                status: "ordering",
            });
            router.push(
                `/order/items?orderUserId=${orderUser.id}&orderId=${orderId}`,
            );
        } catch (error) {
            console.error("Failed to set status:", error);
        }
    }

    function handleCancelOrder() {
        Alert.alert(
            "Cancel Order",
            "Are you sure you want to cancel this order? This action cannot be undone.",
            [
                {
                    text: "No",
                    style: "cancel",
                },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await updateOrder({
                                orderId: orderId as Id<"orders">,
                                status: "cancelled",
                            });
                        } catch (error) {
                            console.error("Failed to cancel order:", error);
                            Alert.alert(
                                "Error",
                                "Failed to cancel order. Please try again.",
                            );
                        }
                    },
                },
            ],
        );
    }

    const buttonState = getButtonState();
    const buttonText =
        buttonState === "readyToRun" ? "Start Run" : "Start Run Anyway";
    const isButtonDisabled = buttonState === "disabled";

    async function handleStartRun() {
        const startRun = async () => {
            try {
                await updateOrder({
                    orderId: orderId as Id<"orders">,
                    paused: true,
                });
                // Navigate to order summary page
                router.push(`/order/summary?orderId=${orderId}`);
            } catch (error) {
                console.error("Failed to start run:", error);
                Alert.alert("Error", "Failed to start run. Please try again.");
            }
        };

        if (buttonState === "enabled") {
            // Not all users are done, show confirmation
            Alert.alert(
                "Start Run Anyway?",
                "Not all participants have finished ordering. Starting now will lock the order and prevent anyone from adding more items. Are you sure?",
                [
                    {
                        text: "No",
                        style: "cancel",
                    },
                    {
                        text: "Yes, Start Run",
                        style: "default",
                        onPress: startRun,
                    },
                ],
            );
        } else {
            // All users are done, start directly
            await startRun();
        }
    }

    // Check if all locations have been scanned (receipts confirmed)
    const allLocationsScanned =
        data?.orderLocations &&
        data.orderLocations.length > 0 &&
        data.orderLocations.every((ol) => ol.receiptTotalInCents !== null);

    if (isPending) {
        return (
            <View className="flex-1 justify-center items-center px-6">
                <Text className="text-foreground">Loading...</Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View className="flex-1 justify-center items-center px-6">
                <Text className="text-destructive">Order not found</Text>
            </View>
        );
    }

    const progressPercent =
        data.completionStats && data.completionStats.total > 0
            ? (data.completionStats.done / data.completionStats.total) * 100
            : 0;

    return (
        <>
            <SafeAreaView edges={["top"]} />
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
                <Pressable
                    onPress={() => router.back()}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon
                        name="ChevronLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
                <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                    Order Details
                </Text>
                {isCreator && (
                    <View className="flex-row gap-2 items-center">
                        {!data.order.paused && (
                            <TouchableOpacity
                                onPress={() => setShowQRModal(true)}
                                className="p-2 rounded-full bg-primary/10">
                                <Icon
                                    name="QrCode"
                                    size={20}
                                    color={NAV_THEME[colorScheme].primary}
                                />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={handleCancelOrder}
                            className="px-3 py-1.5 rounded-full bg-destructive/10">
                            <Text className="text-sm font-medium text-destructive">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Order Info Card */}
                <View className="mx-4 mt-4">
                    <View className="p-5 rounded-2xl border border-muted bg-card">
                        <View className="flex-row justify-between items-start mb-3">
                            <View className="flex-1">
                                <Text className="text-sm text-muted-foreground">
                                    {new Date(
                                        data.order.createdAt,
                                    ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </Text>
                                <Text className="mt-1 text-2xl font-bold text-foreground">
                                    {data.order.name}
                                </Text>
                            </View>
                            <View
                                className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full ${
                                    data.order.paused
                                        ? "bg-orange-500/20"
                                        : "bg-primary/20"
                                }`}>
                                <ReAnimated.View
                                    style={breatheStyle}
                                    className={`w-2 h-2 rounded-full ${
                                        data.order.paused
                                            ? "bg-orange-500"
                                            : "bg-primary"
                                    }`}
                                />
                                <Text
                                    className={`text-sm font-medium ${
                                        data.order.paused
                                            ? "text-orange-500"
                                            : "text-primary"
                                    }`}>
                                    {data.order.paused
                                        ? "In Progress"
                                        : "Ordering"}
                                </Text>
                            </View>
                        </View>

                        {/* Stats Row */}
                        <View className="flex-row gap-4 pt-3 mt-1 border-t border-muted">
                            <View className="flex-row gap-2 items-center">
                                <View className="justify-center items-center w-8 h-8 rounded-full bg-primary/10">
                                    <Icon
                                        name="Users"
                                        size={16}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                                <Text className="text-sm text-muted-foreground">
                                    <Text className="font-semibold text-foreground">
                                        {data.orderUsers.length}
                                    </Text>{" "}
                                    {data.orderUsers.length === 1
                                        ? "person"
                                        : "people"}
                                </Text>
                            </View>
                            <View className="flex-row gap-2 items-center">
                                <View className="justify-center items-center w-8 h-8 rounded-full bg-primary/10">
                                    <Icon
                                        name="ShoppingBag"
                                        size={16}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                                <Text className="text-sm text-muted-foreground">
                                    <Text className="font-semibold text-foreground">
                                        {data.count}
                                    </Text>{" "}
                                    {data.count === 1 ? "item" : "items"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Progress Section */}
                {!data.order.paused && (
                    <View className="px-4 mt-6">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-base font-semibold text-foreground">
                                Order Progress
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                                {data.completionStats?.done} of{" "}
                                {data.completionStats?.total} done
                            </Text>
                        </View>
                        <View className="overflow-hidden h-2 rounded-full bg-muted">
                            <View
                                className={`h-full rounded-full ${
                                    data.completionStats?.allDone
                                        ? "bg-green-500"
                                        : "bg-primary"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </View>
                        {data.completionStats?.allDone && (
                            <View className="flex-row gap-2 items-center mt-2">
                                <Icon
                                    name="CircleCheck"
                                    size={14}
                                    color="#22c55e"
                                />
                                <Text className="text-sm text-green-500">
                                    Everyone's done! Ready to start the run.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Participants Section */}
                <View className="px-4 mt-6 mb-4">
                    <Text className="mb-3 text-base font-semibold text-foreground">
                        Participants
                    </Text>
                    <View className="gap-3">
                        {data.orderUsers.map((orderUser) => {
                            const isCurrentUser =
                                orderUser.userId === currentUserId;
                            const isDone = orderUser.status === "done";

                            return (
                                <View
                                    key={orderUser.id}
                                    className={`flex-row items-center p-4 border rounded-xl ${
                                        isCurrentUser
                                            ? "border-primary/30 bg-primary/5"
                                            : "border-muted bg-card"
                                    }`}>
                                    {/* Avatar */}
                                    <View className="relative">
                                        {orderUser.user?.avatarUrl ? (
                                            <Image
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                }}
                                                className="rounded-full"
                                                source={{
                                                    uri: orderUser.user
                                                        .avatarUrl,
                                                }}
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                }}
                                                className="justify-center items-center rounded-full bg-muted">
                                                <Text className="text-lg font-semibold text-muted-foreground">
                                                    {`${(orderUser.user?.firstName || "").charAt(0)}${(orderUser.user?.lastName || "").charAt(0)}`.toUpperCase() ||
                                                        "U"}
                                                </Text>
                                            </View>
                                        )}
                                        {/* Status indicator */}
                                        <View
                                            className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full items-center justify-center border-2 border-background ${
                                                isDone
                                                    ? "bg-green-500"
                                                    : "bg-orange-400"
                                            }`}>
                                            <Icon
                                                name={
                                                    isDone ? "Check" : "Clock"
                                                }
                                                size={10}
                                                color="white"
                                            />
                                        </View>
                                    </View>

                                    {/* Info */}
                                    <View className="flex-1 ml-3">
                                        <View className="flex-row gap-2 items-center">
                                            <Text
                                                className={`text-base font-medium ${
                                                    isCurrentUser
                                                        ? "text-primary"
                                                        : "text-foreground"
                                                }`}>
                                                {orderUser.user?.firstName}{" "}
                                                {orderUser.user?.lastName}
                                                {isCurrentUser && " (You)"}
                                            </Text>
                                            {orderUser.isCreator && (
                                                <View className="px-2 py-0.5 rounded-full bg-primary/20">
                                                    <Text className="text-xs font-medium text-primary">
                                                        Host
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View className="flex-row gap-2 items-center mt-1">
                                            <Text
                                                className={`text-sm ${
                                                    isDone
                                                        ? "text-green-500"
                                                        : "text-orange-400"
                                                }`}>
                                                {isDone
                                                    ? "Done ordering"
                                                    : "Still ordering"}
                                            </Text>
                                            <Text className="text-muted-foreground">
                                                ·
                                            </Text>
                                            <Text className="text-sm text-muted-foreground">
                                                {orderUser.itemCount}{" "}
                                                {orderUser.itemCount === 1
                                                    ? "item"
                                                    : "items"}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Done badge */}
                                    {isDone && (
                                        <View className="justify-center items-center w-8 h-8 rounded-full bg-green-500/10">
                                            <Icon
                                                name="CircleCheck"
                                                size={20}
                                                color="#22c55e"
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                {data.order.paused && !isCreator ? (
                    <View className="gap-3">
                        <View className="items-center py-2">
                            <View className="justify-center items-center mb-3 w-12 h-12 rounded-full bg-primary/10">
                                <Icon
                                    name="Truck"
                                    size={24}
                                    color={NAV_THEME[colorScheme].primary}
                                />
                            </View>
                            <Text className="text-lg font-semibold text-center text-foreground">
                                Your order is being picked up
                            </Text>
                            <Text className="mt-1 text-sm text-center text-muted-foreground">
                                Sit tight! You'll be notified when it's ready.
                            </Text>
                        </View>
                        {allLocationsScanned && (
                            <TouchableOpacity
                                className="flex-row gap-2 justify-center items-center py-4 w-full rounded-xl bg-primary"
                                onPress={() =>
                                    router.push(
                                        `/order/settlement?orderId=${orderId}`,
                                    )
                                }>
                                <Icon name="Wallet" size={20} color="white" />
                                <Text className="text-base font-semibold text-white">
                                    View Payments
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        {data.order.paused && (
                            <View className="flex-row gap-2 items-center p-3 mb-4 rounded-lg bg-orange-500/10">
                                <Icon
                                    name="CircleAlert"
                                    size={18}
                                    color="#f97316"
                                />
                                <Text className="flex-1 text-sm text-orange-500">
                                    The run has started. No more items can be
                                    added.
                                </Text>
                            </View>
                        )}
                        <View className="flex-col gap-3">
                            {data.order.paused && isCreator ? (
                                <>
                                    <TouchableOpacity
                                        className="flex-row gap-2 justify-center items-center py-4 w-full rounded-xl bg-primary"
                                        onPress={() =>
                                            router.push(
                                                `/order/summary?orderId=${orderId}`,
                                            )
                                        }>
                                        <Icon
                                            name="ClipboardList"
                                            size={20}
                                            color="white"
                                        />
                                        <Text className="text-base font-semibold text-white">
                                            View Order Summary
                                        </Text>
                                    </TouchableOpacity>
                                    {allLocationsScanned && (
                                        <TouchableOpacity
                                            className="flex-row gap-2 justify-center items-center py-4 w-full rounded-xl border border-primary"
                                            onPress={() =>
                                                router.push(
                                                    `/order/settlement?orderId=${orderId}`,
                                                )
                                            }>
                                            <Icon
                                                name="Wallet"
                                                size={20}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .primary
                                                }
                                            />
                                            <Text className="text-base font-semibold text-primary">
                                                View Payments
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            ) : (
                                <TouchableOpacity
                                    className="flex-row gap-2 justify-center items-center py-4 w-full rounded-xl bg-primary"
                                    onPress={handleSelectItems}>
                                    <Icon name="Plus" size={20} color="white" />
                                    <Text className="text-base font-semibold text-white">
                                        Select Items
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {isCreator && !data.order.paused && (
                                <Animated.View
                                    style={{
                                        opacity: buttonOpacity,
                                        transform: [
                                            { translateY: buttonTranslateY },
                                        ],
                                    }}>
                                    <TouchableOpacity
                                        className={`w-full py-4 border rounded-xl flex-row items-center justify-center gap-2 ${
                                            isButtonDisabled
                                                ? "border-muted bg-muted"
                                                : buttonState === "readyToRun"
                                                  ? "border-green-500 bg-green-500/10"
                                                  : "border-primary bg-primary/10"
                                        }`}
                                        onPress={handleStartRun}
                                        disabled={isButtonDisabled}>
                                        <Icon
                                            name="Play"
                                            size={18}
                                            color={
                                                isButtonDisabled
                                                    ? NAV_THEME[colorScheme]
                                                          .border
                                                    : buttonState ===
                                                        "readyToRun"
                                                      ? "#22c55e"
                                                      : NAV_THEME[colorScheme]
                                                            .primary
                                            }
                                        />
                                        <Text
                                            className={`text-base font-semibold ${
                                                isButtonDisabled
                                                    ? "text-muted-foreground"
                                                    : buttonState ===
                                                        "readyToRun"
                                                      ? "text-green-500"
                                                      : "text-primary"
                                            }`}>
                                            {buttonText}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </View>
                    </>
                )}
            </View>

            {/* QR Code Modal for inviting users */}
            {isCreator && data && (
                <QRCodeModal
                    visible={showQRModal}
                    orderId={orderId as Id<"orders">}
                    orderName={data.order.name}
                    onClose={() => setShowQRModal(false)}
                />
            )}
        </>
    );
}
