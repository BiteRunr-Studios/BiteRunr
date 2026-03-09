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
import { Flow } from "react-native-animated-spinkit";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { useColorScheme } from "@/lib/use-color-scheme";
import ReAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    SharedValue,
    interpolate,
    Extrapolation,
    FadeInUp,
    FadeOutRight,
    LinearTransition,
} from "react-native-reanimated";
import { NAV_THEME } from "@/lib/constants";
import Icon from "@/components/common/icon";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QRCodeModal } from "@/components/qr-code-modal";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";

type ButtonState = "readyToRun" | "enabled" | "disabled";

function UserItemsList({ orderUserId }: { orderUserId: Id<"orderUsers"> }) {
    const items = useQuery(api.orderItems.listForOrderUser, { orderUserId });

    if (items === undefined) {
        return (
            <View className="px-4 py-3">
                <Flow size={18} color="#888" />
            </View>
        );
    }

    if (items.length === 0) {
        return (
            <View className="px-4 py-3">
                <Text className="text-sm italic text-muted-foreground">
                    No items added
                </Text>
            </View>
        );
    }

    return (
        <View className="px-4 pt-2 pb-3">
            {items.map((item) => (
                <View
                    key={item.id}
                    className="flex-row items-start justify-between py-1.5">
                    <View className="flex-1">
                        <Text className="text-sm text-foreground">
                            {item.itemName}
                        </Text>
                        {item.comments ? (
                            <Text className="mt-0.5 text-xs text-muted-foreground">
                                {item.comments}
                            </Text>
                        ) : null}
                    </View>
                    <Text className="ml-3 text-sm text-muted-foreground">
                        x{item.quantity}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export default function SpecificOrder() {
    const { orderId } = useLocalSearchParams();
    const { colorScheme } = useColorScheme();
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const buttonTranslateY = useRef(new Animated.Value(20)).current;
    const [showQRModal, setShowQRModal] = useState(false);
    const [isSelectingItems, setIsSelectingItems] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [isTransferringRunner, setIsTransferringRunner] = useState(false);
    const transferRunnerSheetRef = useRef<ActionSheetRef>(null);

    const toggleExpanded = useCallback((orderUserId: string) => {
        setExpandedUserId((prev) => (prev === orderUserId ? null : orderUserId));
    }, []);

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
    const transferRunner = useMutation(api.orders.transferRunner);
    const leaveOrder = useMutation(api.orderUsers.leaveOrder);
    const removeFromOrder = useMutation(api.orderUsers.removeFromOrder);

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
        if (isSelectingItems) return;

        const orderUser = data?.orderUsers.find(
            (x) => x.userId === currentUserId,
        );

        if (!orderUser) {
            Alert.alert("Error", "Unable to find your order participation.");
            return;
        }

        setIsSelectingItems(true);
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
        } finally {
            setIsSelectingItems(false);
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
    const transferCandidates =
        data?.orderUsers.filter((orderUser) => !orderUser.isCreator) ?? [];

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

    function handleLeaveGroup() {
        Alert.alert(
            "Leave Group",
            "Are you sure you want to leave this order? Your items will be removed.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await leaveOrder({
                                orderId: orderId as Id<"orders">,
                            });
                            router.back();
                        } catch (error) {
                            console.error("Failed to leave order:", error);
                            Alert.alert(
                                "Error",
                                "Failed to leave order. Please try again.",
                            );
                        }
                    },
                },
            ],
        );
    }

    function handleOpenTransferRunnerSheet() {
        transferRunnerSheetRef.current?.show();
    }

    function runAfterSheetClose(action: () => void) {
        // Let the sheet fully dismiss before opening another modal/alert.
        setTimeout(action, 250);
    }

    function handleTransferRunner(
        nextRunner: NonNullable<typeof data>["orderUsers"][number],
    ) {
        transferRunnerSheetRef.current?.hide();

        runAfterSheetClose(() => {
            if (!nextRunner.hasStripePaymentsEnabled) {
                Alert.alert(
                    "Stripe Required",
                    `${nextRunner.user?.firstName ?? "This person"} needs to finish Stripe payments setup before becoming the runner.`,
                );
                return;
            }

            const nextRunnerName =
                `${nextRunner.user?.firstName ?? ""} ${nextRunner.user?.lastName ?? ""}`.trim() ||
                "this person";

            Alert.alert(
                "Transfer Runner",
                `Make ${nextRunnerName} the new runner for this order? Future card payments will go to them instead of you.`,
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                    {
                        text: "Transfer",
                        onPress: async () => {
                            setIsTransferringRunner(true);
                            try {
                                await transferRunner({
                                    orderId: orderId as Id<"orders">,
                                    newCreatorId: nextRunner.userId as Id<"users">,
                                });
                                Alert.alert(
                                    "Runner Updated",
                                    `${nextRunnerName} is now the runner for this order.`,
                                );
                            } catch (error) {
                                console.error("Failed to transfer runner:", error);
                                Alert.alert(
                                    "Error",
                                    error instanceof Error
                                        ? error.message
                                        : "Failed to transfer the runner. Please try again.",
                                );
                            } finally {
                                setIsTransferringRunner(false);
                            }
                        },
                    },
                ],
            );
        });
    }

    function confirmRemoveMember(
        targetUserId: Id<"users">,
        memberName: string,
        swipeable: any,
    ) {
        Alert.alert(
            "Remove Member",
            `Are you sure you want to remove ${memberName} from this order? Their items will be deleted.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => swipeable.close(),
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        setRemovingUserId(targetUserId);
                        try {
                            await removeFromOrder({
                                orderId: orderId as Id<"orders">,
                                targetUserId,
                            });
                        } catch (error) {
                            console.error("Failed to remove member:", error);
                            Alert.alert(
                                "Error",
                                "Failed to remove member. Please try again.",
                            );
                        } finally {
                            setRemovingUserId(null);
                        }
                        swipeable.close();
                    },
                },
            ],
        );
    }

    function RemoveRightAction({
        progress,
        targetUserId,
        memberName,
        swipeable,
    }: {
        progress: SharedValue<number>;
        targetUserId: Id<"users">;
        memberName: string;
        swipeable: any;
    }) {
        const animatedStyle = useAnimatedStyle(() => {
            const scale = interpolate(
                progress.value,
                [0, 1],
                [0.5, 1],
                Extrapolation.CLAMP,
            );
            const opacity = interpolate(
                progress.value,
                [0, 0.5, 1],
                [0, 0.5, 1],
                Extrapolation.CLAMP,
            );
            return { transform: [{ scale }], opacity };
        });

        return (
            <View className="justify-center pl-4">
                <ReAnimated.View style={animatedStyle}>
                    <TouchableOpacity
                        onPress={() =>
                            confirmRemoveMember(
                                targetUserId,
                                memberName,
                                swipeable,
                            )
                        }
                        className="items-center justify-center w-16 h-16 rounded-full"
                        style={{ backgroundColor: "hsl(0, 84%, 60%)" }}
                        activeOpacity={0.7}>
                        <Icon name="UserMinus" size={22} color="white" />
                    </TouchableOpacity>
                </ReAnimated.View>
            </View>
        );
    }

    const renderRemoveRightActions = useCallback(
        (targetUserId: Id<"users">, memberName: string) => {
            return (
                progress: SharedValue<number>,
                _drag: SharedValue<number>,
                swipeable: any,
            ) => (
                <RemoveRightAction
                    progress={progress}
                    targetUserId={targetUserId}
                    memberName={memberName}
                    swipeable={swipeable}
                />
            );
        },
        [],
    );

    if (isPending) {
        return (
            <Skeleton>
                <SafeAreaView edges={["top"]} />
                {/* Header skeleton */}
                <View className="flex-row items-center px-4 py-3 border-b border-border">
                    <SkeletonBlock width={32} height={32} rounded="rounded-full" />
                    <View className="ml-2">
                        <SkeletonBlock width={120} height={22} />
                    </View>
                </View>

                {/* Order info card skeleton */}
                <View className="mx-4 mt-4">
                    <View className="p-5 border rounded-2xl border-muted bg-card">
                        <View className="flex-row items-start justify-between mb-3">
                            <View>
                                <SkeletonBlock width={100} height={14} className="mb-2" />
                                <SkeletonBlock width={180} height={28} />
                            </View>
                            <SkeletonBlock width={90} height={28} rounded="rounded-full" />
                        </View>
                        <View className="flex-row gap-4 pt-3 mt-1 border-t border-muted">
                            <View className="flex-row items-center gap-2">
                                <SkeletonBlock width={32} height={32} rounded="rounded-full" />
                                <SkeletonBlock width={60} height={16} />
                            </View>
                            <View className="flex-row items-center gap-2">
                                <SkeletonBlock width={32} height={32} rounded="rounded-full" />
                                <SkeletonBlock width={50} height={16} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Progress skeleton */}
                <View className="px-4 mt-6">
                    <View className="flex-row items-center justify-between mb-3">
                        <SkeletonBlock width={120} height={18} />
                        <SkeletonBlock width={80} height={14} />
                    </View>
                    <SkeletonBlock width="100%" height={8} rounded="rounded-full" />
                </View>

                {/* Participants skeleton */}
                <View className="px-4 mt-6">
                    <SkeletonBlock width={110} height={18} className="mb-3" />
                    <View className="gap-3">
                        {[1, 2, 3].map((i) => (
                            <View
                                key={i}
                                className="flex-row items-center p-4 border rounded-xl border-muted bg-card">
                                <SkeletonBlock width={48} height={48} rounded="rounded-full" />
                                <View className="flex-1 ml-3">
                                    <SkeletonBlock width={130} height={16} className="mb-2" />
                                    <SkeletonBlock width={90} height={14} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </Skeleton>
        );
    }

    if (!data) {
        return (
            <View className="items-center justify-center flex-1 px-6">
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
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                <Pressable
                    onPress={() => router.back()}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon
                        name="ChevronLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
                <Text
                    numberOfLines={1}
                    className="flex-1 ml-2 mr-2 text-xl font-semibold text-foreground">
                    Order Details
                </Text>
                {isCreator && (
                    <View className="flex-row items-center gap-2">
                        {!data.order.paused && (
                            <>
                                <TouchableOpacity
                                    onPress={() => setShowQRModal(true)}
                                    className="items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                                    <Icon
                                        name="QrCode"
                                        size={18}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleOpenTransferRunnerSheet}
                                    disabled={isTransferringRunner}
                                    className="items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                                    {isTransferringRunner ? (
                                        <Flow size={16} color="#888" />
                                    ) : (
                                        <Icon
                                            name="RefreshCw"
                                            size={18}
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity
                            onPress={handleCancelOrder}
                            className="items-center justify-center w-9 h-9 rounded-full bg-destructive/10">
                            <Icon
                                name="CircleX"
                                size={18}
                                color={NAV_THEME[colorScheme].notification}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Order Info Card */}
                <ReAnimated.View
                    entering={FadeInUp.duration(500).easing(Easing.out(Easing.ease))}
                    className="mx-4 mt-4">
                    <View className="p-5 border rounded-2xl border-muted bg-card">
                        <View className="flex-row items-start justify-between mb-3">
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
                            <View className="flex-row items-center gap-2">
                                <View className="items-center justify-center w-8 h-8 rounded-full bg-primary/10">
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
                            <View className="flex-row items-center gap-2">
                                <View className="items-center justify-center w-8 h-8 rounded-full bg-primary/10">
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
                </ReAnimated.View>

                {/* Progress Section */}
                {!data.order.paused && (
                    <ReAnimated.View
                        entering={FadeInUp.duration(500).delay(100).easing(Easing.out(Easing.ease))}
                        className="px-4 mt-6">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-base font-semibold text-foreground">
                                Order Progress
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                                {data.completionStats?.done} of{" "}
                                {data.completionStats?.total} done
                            </Text>
                        </View>
                        <View className="h-2 overflow-hidden rounded-full bg-muted">
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
                            <View className="flex-row items-center gap-2 mt-2">
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
                    </ReAnimated.View>
                )}

                {/* Participants Section */}
                <ReAnimated.View
                    entering={FadeInUp.duration(500).delay(200).easing(Easing.out(Easing.ease))}
                    className="px-4 mt-6 mb-4">
                    <Text className="mb-3 text-base font-semibold text-foreground">
                        Participants
                    </Text>
                    <View className="gap-3">
                        {data.orderUsers.map((orderUser) => {
                            const isCurrentUser =
                                orderUser.userId === currentUserId;
                            const isDone = orderUser.status === "done";
                            const isExpanded = expandedUserId === orderUser.id;

                            const cardContent = (
                                <>
                                    <View className="flex-row items-center p-4">
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
                                                    className="items-center justify-center rounded-full bg-muted">
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
                                                        isDone
                                                            ? "Check"
                                                            : "Clock"
                                                    }
                                                    size={10}
                                                    color="white"
                                                />
                                            </View>
                                        </View>

                                        {/* Info */}
                                        <View className="flex-1 ml-3">
                                            <View className="flex-row items-center gap-2">
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
                                            <View className="flex-row items-center gap-2 mt-1">
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

                                        {/* Chevron / Done badge */}
                                        {isDone ? (
                                            <Icon
                                                name={
                                                    isExpanded
                                                        ? "ChevronUp"
                                                        : "ChevronDown"
                                                }
                                                size={20}
                                                color="#22c55e"
                                            />
                                        ) : null}
                                    </View>

                                    {/* Expanded items list */}
                                    {isDone && isExpanded && (
                                        <View className="border-t border-muted">
                                            <UserItemsList
                                                orderUserId={
                                                    orderUser.id as Id<"orderUsers">
                                                }
                                            />
                                        </View>
                                    )}
                                </>
                            );

                            const canSwipeRemove =
                                isCreator &&
                                !orderUser.isCreator &&
                                !data.order.paused;

                            const memberName =
                                `${orderUser.user?.firstName ?? ""} ${orderUser.user?.lastName ?? ""}`.trim();

                            const cardStyle = `border rounded-xl overflow-hidden ${
                                isCurrentUser
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-muted bg-card"
                            }`;

                            const card = isDone ? (
                                <Pressable
                                    onPress={() =>
                                        toggleExpanded(orderUser.id)
                                    }
                                    className={cardStyle}>
                                    {cardContent}
                                </Pressable>
                            ) : (
                                <View className={cardStyle}>
                                    {cardContent}
                                </View>
                            );

                            const wrappedCard = canSwipeRemove ? (
                                <Swipeable
                                    renderRightActions={renderRemoveRightActions(
                                        orderUser.userId as Id<"users">,
                                        memberName,
                                    )}
                                    overshootRight={false}>
                                    {card}
                                </Swipeable>
                            ) : (
                                card
                            );

                            return (
                                <ReAnimated.View
                                    key={orderUser.id}
                                    exiting={FadeOutRight.duration(300)}
                                    layout={LinearTransition.duration(300)}>
                                    {wrappedCard}
                                </ReAnimated.View>
                            );
                        })}
                    </View>
                </ReAnimated.View>
            </ScrollView>

            {/* Footer */}
            <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                {data.order.paused && !isCreator ? (
                    <View className="items-center py-4">
                        <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-primary/10">
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
                        <TouchableOpacity
                            className="flex-row items-center justify-center gap-2 px-6 py-3 mt-4 rounded-xl bg-primary"
                            onPress={() =>
                                router.push(
                                    `/order/my-settlement?orderId=${orderId}`,
                                )
                            }>
                            <Icon
                                name="Receipt"
                                size={18}
                                color="white"
                            />
                            <Text className="text-base font-semibold text-white">
                                View My Settlement
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {data.order.paused && (
                            <View className="flex-row items-center gap-2 p-3 mb-4 rounded-lg bg-orange-500/10">
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
                                <TouchableOpacity
                                    className="flex-row items-center justify-center w-full gap-2 py-4 rounded-xl bg-primary"
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
                            ) : (
                                <TouchableOpacity
                                    className={`flex-row items-center justify-center w-full gap-2 py-4 rounded-xl bg-primary ${isSelectingItems ? "opacity-50" : ""}`}
                                    onPress={handleSelectItems}
                                    disabled={isSelectingItems}>
                                    {isSelectingItems ? (
                                        <Flow size={22} color="white" />
                                    ) : (
                                        <Icon name="Plus" size={20} color="white" />
                                    )}
                                    <Text className="text-base font-semibold text-white">
                                        Select Items
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {!isCreator && !data.order.paused && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-center w-full gap-2 py-4 border rounded-xl border-destructive bg-destructive/10"
                                    onPress={handleLeaveGroup}>
                                    <Icon
                                        name="LogOut"
                                        size={18}
                                        color={
                                            NAV_THEME[colorScheme].notification
                                        }
                                    />
                                    <Text className="text-base font-semibold text-destructive">
                                        Leave Group
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

            <ActionSheet
                ref={transferRunnerSheetRef}
                gestureEnabled
                indicatorStyle={{
                    width: 48,
                    height: 5,
                    backgroundColor:
                        colorScheme === "dark"
                            ? "rgba(255,255,255,0.18)"
                            : "rgba(15,23,42,0.12)",
                }}
                containerStyle={{
                    backgroundColor:
                        colorScheme === "dark"
                            ? "hsl(0, 0%, 7%)"
                            : "hsl(0, 0%, 96%)",
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    paddingBottom: 24,
                }}>
                <View className="px-5 pt-2">
                    <Text className="text-xl font-semibold text-foreground">
                        Choose a New Runner
                    </Text>
                    <Text className="mt-2 text-sm leading-5 text-muted-foreground">
                        Only members with Stripe payments already set up can
                        take over. New card payments for this order will go to
                        the person you select.
                    </Text>
                </View>

                <View className="px-5 mt-5">
                    {transferCandidates.length === 0 ? (
                        <View className="p-4 rounded-2xl border border-border bg-card">
                            <Text className="text-sm text-muted-foreground">
                                There isn&apos;t anyone else in this order yet.
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {transferCandidates.map((candidate) => {
                                const candidateName =
                                    `${candidate.user?.firstName ?? ""} ${candidate.user?.lastName ?? ""}`.trim() ||
                                    "Unknown member";
                                const isEligible =
                                    candidate.hasStripePaymentsEnabled;

                                return (
                                    <TouchableOpacity
                                        key={candidate.id}
                                        className="p-4 border rounded-2xl border-border bg-card"
                                        onPress={() =>
                                            handleTransferRunner(candidate)
                                        }
                                        disabled={isTransferringRunner}>
                                        <View className="flex-row items-center justify-between gap-3">
                                            <View className="flex-1">
                                                <Text className="text-base font-semibold text-foreground">
                                                    {candidateName}
                                                </Text>
                                                <Text className="mt-1 text-sm text-muted-foreground">
                                                    {isEligible
                                                        ? "Stripe payments ready"
                                                        : "Stripe payments not set up"}
                                                </Text>
                                            </View>
                                            <View
                                                className={`px-3 py-1 rounded-full ${
                                                    isEligible
                                                        ? "bg-green-500/15"
                                                        : "bg-orange-500/15"
                                                }`}>
                                                <Text
                                                    className={`text-xs font-medium ${
                                                        isEligible
                                                            ? "text-green-600"
                                                            : "text-orange-500"
                                                    }`}>
                                                    {isEligible
                                                        ? "Eligible"
                                                        : "Not ready"}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                <View className="px-5 mt-5">
                    <TouchableOpacity
                        onPress={() => transferRunnerSheetRef.current?.hide()}
                        className="items-center justify-center py-4 rounded-2xl bg-muted">
                        <Text className="text-base font-medium text-foreground">
                            Close
                        </Text>
                    </TouchableOpacity>
                </View>
            </ActionSheet>

        </>
    );
}
