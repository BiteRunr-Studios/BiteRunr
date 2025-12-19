import {
    ScrollView,
    Text,
    View,
    Image,
    TouchableOpacity,
    Animated,
} from "react-native";
import { PageWithHeader } from "@/components/page-with-header";
import { AwaitingOrdersDTO, OrderStatus } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { getOrder } from "@/api/order/single";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";
import { setOrderUserStatus } from "@/api/order/setOrderUserStatus";

type ButtonState = "readyToRun" | "enabled" | "disabled";

export default function SpecificOrder() {
    const { orderId } = useLocalSearchParams();
    const isFocused = useIsFocused();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const buttonTranslateY = useRef(new Animated.Value(20)).current;

    const { data, isPending, isError, error } = useQuery<AwaitingOrdersDTO>({
        queryKey: ["order", orderId],
        queryFn: () => getOrder(orderId as string),
        enabled: isFocused,
        refetchInterval: isFocused ? 2_500 : false,
    });

    const prevStatusRef = useRef<OrderStatus | null>(null);

    useEffect(() => {
        if (
            data?.order.status === OrderStatus.Cancelled &&
            prevStatusRef.current !== null &&
            prevStatusRef.current !== OrderStatus.Cancelled
        ) {
            router.dismissAll();
        }
        prevStatusRef.current = data?.order.status ?? null;
    }, [data?.order.status]);

    useEffect(() => {
        async function getCurrentUser() {
            const { data: userData } = await supabase.auth.getUser();
            setCurrentUserId(userData?.user?.id ?? null);
        }
        getCurrentUser();
    }, []);

    const isCreator = currentUserId === data?.order.creator_id;

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
        if (!data?.order_users || data.order_users.length === 0) {
            return "disabled";
        }

        const allDone = data.order_users.every(
            (user) => user.status === "done"
        );
        const someDone = data.order_users.some(
            (user) => user.status === "done"
        );

        if (allDone) {
            return "readyToRun";
        } else if (someDone) {
            return "enabled";
        } else {
            return "disabled";
        }
    };

    function handleSelectItems() {
        setOrderUserStatus(orderId as string, { status: "ordering" });
        router.push(
            `/order/items?orderUserId=${
                data?.order_users.find((x) => x.user_id === currentUserId)?.id
            }&orderId=${orderId}`
        );
    }

    const buttonState = getButtonState();
    const buttonText =
        buttonState === "readyToRun" ? "Start Run" : "Start Run Anyway";
    const isButtonDisabled = buttonState === "disabled";

    if (isPending) {
        return (
            <PageWithHeader title="Order Details">
                <View className="items-center justify-center flex-1 px-6">
                    <Text className="text-foreground">Loading...</Text>
                </View>
            </PageWithHeader>
        );
    }

    if (isError) {
        return (
            <PageWithHeader title="Order Details">
                <View className="items-center justify-center flex-1 px-6">
                    <Text className="text-destructive">
                        Error: {error?.message ?? "Failed to load order"}
                    </Text>
                </View>
            </PageWithHeader>
        );
    }

    return (
        <PageWithHeader title="Order Details">
            <View className="flex-1 px-6">
                <View className="flex-col w-full gap-2 p-4 mb-2 border rounded-2xl border-muted bg-card">
                    <View className="flex-row justify-between">
                        <Text className="text-lg text-muted-foreground">
                            {`Started on ${new Date(
                                data?.order.created_at
                            ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}`}
                        </Text>
                        <View className="flex-row items-center justify-center gap-2 px-2 py-1 rounded-full h-max w-max bg-primary">
                            <Feather name="circle" size={12} color="white" />
                            <Text className="text-sm text-white">Active</Text>
                        </View>
                    </View>
                    <Text className="text-3xl font-semibold text-foreground">
                        {data?.order.name}
                    </Text>
                </View>
                <ScrollView className="flex-1">
                    {/* Participants */}
                    <View>
                        {data?.order_users.map((orderUser) => (
                            <View key={orderUser.id} className="flex-row py-4">
                                <View className="flex-row items-center flex-1 gap-2">
                                    <Image
                                        style={{ width: 36, height: 36 }}
                                        className="rounded-full"
                                        source={{
                                            uri:
                                                orderUser.user?.avatar_url ??
                                                `https://ui-avatars.com/api/?name=${orderUser.user?.first_name}+${orderUser.user?.last_name}`,
                                        }}
                                    />
                                    <View className="flex-1">
                                        <Text className="text-foreground">
                                            {orderUser.user?.first_name}{" "}
                                            {orderUser.user?.last_name}
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

                {/* Footer */}
                <View className="pt-4 pb-10 border-t border-muted bg-background">
                    <Text className="mb-3 text-sm text-center text-muted-foreground">
                        {data?.count > 0
                            ? `${data?.count} Items Added`
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
                                    transform: [
                                        { translateY: buttonTranslateY },
                                    ],
                                }}>
                                <TouchableOpacity
                                    className={`w-full py-3 border rounded-lg ${
                                        isButtonDisabled
                                            ? "border-muted bg-muted"
                                            : "border-primary bg-primary/10"
                                    }`}
                                    onPress={() =>
                                        console.log("Start Run pressed")
                                    }
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
            </View>
        </PageWithHeader>
    );
}
