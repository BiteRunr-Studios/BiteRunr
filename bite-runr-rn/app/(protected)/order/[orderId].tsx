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
import { useEffect, useRef } from "react";
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

type ButtonState = "readyToRun" | "enabled" | "disabled";

export default function SpecificOrder() {
    const { orderId } = useLocalSearchParams();
    const { colorScheme } = useColorScheme();
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const buttonTranslateY = useRef(new Animated.Value(20)).current;

    const breatheValue = useSharedValue(1);
    breatheValue.value = withRepeat(
        withSequence(
            withTiming(0.4, {
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
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
        orderId ? { orderId: orderId as Id<"orders"> } : "skip"
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
        try {
            await setStatus({
                orderId: orderId as Id<"orders">,
                status: "ordering",
            });
            const orderUser = data?.orderUsers.find(
                (x) => x.userId === currentUserId
            );
            router.push(
                `/order/items?orderUserId=${orderUser?.id}&orderId=${orderId}`
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
                                "Failed to cancel order. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    }

    const buttonState = getButtonState();
    const buttonText =
        buttonState === "readyToRun" ? "Start Run" : "Start Run Anyway";
    const isButtonDisabled = buttonState === "disabled";

    if (isPending) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <Text className="text-foreground">Loading...</Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <Text className="text-destructive">Order not found</Text>
            </View>
        );
    }

    return (
        <>
            <SafeAreaView edges={["top"]}></SafeAreaView>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 my-4 border-b border-border">
                <Pressable
                    onPress={() => router.back()}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon name="ChevronLeft" size={24} color="#f97316" />
                </Pressable>
                <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                    Order
                </Text>
                <TouchableOpacity onPress={handleCancelOrder}>
                    <Text
                        className="text-lg font-semibold text-center"
                        style={{
                            color: NAV_THEME[colorScheme].notification,
                        }}>
                        Cancel Order
                    </Text>
                </TouchableOpacity>
            </View>
            <View className="flex-1 px-6">
                <View className="flex-col w-full gap-2 p-4 mb-2 border rounded-2xl border-muted bg-card">
                    <View className="flex-row justify-between">
                        <Text className="text-lg text-muted-foreground">
                            {`Started on ${new Date(
                                data.order.createdAt
                            ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}`}
                        </Text>
                        <View className="flex-row items-center justify-center gap-2 px-2 py-1 rounded-full h-max w-max bg-primary">
                            <ReAnimated.View
                                style={breatheStyle}
                                className="w-4 h-4 bg-white rounded-full"
                            />
                            <Text className="text-sm text-white">Active</Text>
                        </View>
                    </View>
                    <Text className="text-3xl font-semibold text-foreground">
                        {data.order.name}
                    </Text>
                </View>
                <ScrollView className="flex-1">
                    {/* Participants */}
                    <View>
                        {data.orderUsers.map((orderUser) => (
                            <View key={orderUser.id} className="flex-row py-4">
                                <View className="flex-row items-center flex-1 gap-2">
                                    <Image
                                        style={{ width: 36, height: 36 }}
                                        className="rounded-full"
                                        source={{
                                            uri:
                                                orderUser.user?.avatarUrl ??
                                                `https://ui-avatars.com/api/?name=${orderUser.user?.firstName}+${orderUser.user?.lastName}`,
                                        }}
                                    />
                                    <View className="flex-1">
                                        <Text className="text-foreground">
                                            {orderUser.user?.firstName}{" "}
                                            {orderUser.user?.lastName}
                                        </Text>
                                        <Text className="text-sm text-muted-foreground">
                                            {orderUser.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Footer */}
            <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                <Text className="mb-3 text-sm text-center text-muted-foreground">
                    {data.count > 0
                        ? `${data.count} Items Added`
                        : "No Items Added"}
                </Text>
                <View className="flex-col gap-2">
                    <TouchableOpacity
                        className="w-full py-3 rounded-lg bg-primary"
                        onPress={handleSelectItems}>
                        <Text className="text-sm font-semibold text-center text-foreground">
                            Select Items
                        </Text>
                    </TouchableOpacity>
                    {isCreator && (
                        <Animated.View
                            style={{
                                opacity: buttonOpacity,
                                transform: [{ translateY: buttonTranslateY }],
                            }}>
                            <TouchableOpacity
                                className={`w-full py-3 border rounded-lg ${
                                    isButtonDisabled
                                        ? "border-muted bg-muted"
                                        : "border-primary bg-primary/10"
                                }`}
                                onPress={() => console.log("Start Run pressed")}
                                disabled={isButtonDisabled}>
                                <Text
                                    className={`text-sm font-semibold text-center ${
                                        isButtonDisabled
                                            ? "text-muted-foreground"
                                            : "text-primary"
                                    }`}>
                                    {buttonText}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </View>
        </>
    );
}
