import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { View, Text, Image } from "react-native";
import Icon from "./common/icon";
import ReAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    cancelAnimation,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Skeleton, SkeletonBlock } from "./common/skeleton";

type OrderStatus = "created" | "active" | "completed" | "cancelled";

interface OrderUser {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
}

interface OrderCardProps {
    id: string;
    name: string;
    comments?: string | null;
    status: OrderStatus;
    paused: boolean;
    createdAt: number | Date;
    orderUsers?: OrderUser[];
    itemCount?: number;
}

export function OrderCard({
    name,
    comments,
    status,
    paused,
    createdAt,
    orderUsers,
    itemCount,
}: OrderCardProps) {
    const isCancelled = status === "cancelled";
    const isCompleted = status === "completed";
    const isActive = status === "active";
    const { colorScheme } = useColorScheme();

    const createdDate =
        typeof createdAt === "number" ? new Date(createdAt) : createdAt;

    // Breathing animation for active status
    const breatheValue = useSharedValue(1);

    useEffect(() => {
        if (isActive && !paused) {
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
                ),
                -1,
                false,
            );
        } else {
            cancelAnimation(breatheValue);
            breatheValue.value = withTiming(1, { duration: 200 });
        }
    }, [isActive, paused, breatheValue]);

    const breatheStyle = useAnimatedStyle(() => ({
        opacity: breatheValue.value,
    }));

    const getStatusConfig = () => {
        if (isCancelled) {
            return {
                bg: "bg-red-500/10",
                dotBg: "bg-red-500",
                text: "text-red-500",
                label: "Cancelled",
                icon: "CircleX" as const,
            };
        }
        if (isCompleted) {
            return {
                bg: "bg-green-500/10",
                dotBg: "bg-green-500",
                text: "text-green-500",
                label: "Completed",
                icon: "CircleCheck" as const,
            };
        }
        if (paused) {
            return {
                bg: "bg-orange-500/10",
                dotBg: "bg-orange-500",
                text: "text-orange-500",
                label: "In Progress",
                icon: "Truck" as const,
            };
        }
        return {
            bg: "bg-primary/10",
            dotBg: "bg-primary",
            text: "text-primary",
            label: "Ordering",
            icon: "Clock" as const,
        };
    };

    const statusConfig = getStatusConfig();

    return (
        <View className="flex-1 p-4 border rounded-2xl border-muted bg-card">
            {/* Header Row */}
            <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                    <Text className="text-sm text-muted-foreground">
                        {createdDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                        })}
                    </Text>
                    <Text
                        className="mt-1 text-xl font-bold text-foreground"
                        numberOfLines={1}>
                        {name}
                    </Text>
                </View>
                <View
                    className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg}`}>
                    {isActive && !paused ? (
                        <ReAnimated.View
                            style={breatheStyle}
                            className={`w-2 h-2 rounded-full ${statusConfig.dotBg}`}
                        />
                    ) : (
                        <Icon
                            name={statusConfig.icon}
                            size={12}
                            color={
                                isCancelled
                                    ? "#ef4444"
                                    : isCompleted
                                      ? "#22c55e"
                                      : paused
                                        ? "#f97316"
                                        : NAV_THEME[colorScheme].primary
                            }
                        />
                    )}
                    <Text
                        className={`text-xs font-medium ${statusConfig.text}`}>
                        {statusConfig.label}
                    </Text>
                </View>
            </View>

            {/* Comments */}
            {comments && (
                <Text
                    className="mb-3 text-sm text-muted-foreground"
                    numberOfLines={2}>
                    {comments}
                </Text>
            )}

            {/* Footer Row - Avatars and Stats */}
            <View className="flex-row items-center justify-between pt-3 mt-auto border-t border-muted">
                {/* Stacked Avatars */}
                {orderUsers && orderUsers.length > 0 && (
                    <View className="flex-row items-center">
                        {orderUsers
                            .slice(0, orderUsers.length > 4 ? 3 : 4)
                            .map((orderUser, idx) => (
                                <View
                                    key={orderUser.id}
                                    style={{
                                        marginLeft: idx > 0 ? -12 : 0,
                                        zIndex: orderUsers.length - idx,
                                    }}
                                    className="border-2 rounded-full border-card">
                                    {orderUser.avatarUrl ? (
                                        <Image
                                            style={{
                                                width: 32,
                                                height: 32,
                                            }}
                                            className="rounded-full"
                                            source={{
                                                uri: orderUser.avatarUrl,
                                            }}
                                        />
                                    ) : (
                                        <View
                                            style={{
                                                width: 32,
                                                height: 32,
                                            }}
                                            className="items-center justify-center rounded-full bg-muted">
                                            <Text
                                                style={{ fontSize: 12 }}
                                                className="font-semibold text-muted-foreground">
                                                {`${(orderUser.firstName || "").charAt(0)}${(orderUser.lastName || "").charAt(0)}`.toUpperCase() ||
                                                    "U"}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        {orderUsers.length > 4 && (
                            <View
                                style={{
                                    marginLeft: -12,
                                    width: 32,
                                    height: 32,
                                    zIndex: 0,
                                }}
                                className="flex items-center justify-center border-2 rounded-full border-card bg-primary">
                                <Text className="text-xs font-semibold text-white">
                                    +{orderUsers.length - 3}
                                </Text>
                            </View>
                        )}
                        <Text className="ml-2 text-sm text-muted-foreground">
                            {orderUsers.length}{" "}
                            {orderUsers.length === 1 ? "person" : "people"}
                        </Text>
                    </View>
                )}

                {/* Stats */}
                {itemCount !== undefined && itemCount > 0 && (
                    <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted">
                        <Icon
                            name="ShoppingBag"
                            size={14}
                            color={NAV_THEME[colorScheme].text}
                        />
                        <Text className="text-xs font-medium text-muted-foreground">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

export function OrderCardSkeleton() {
    return (
        <Skeleton>
            <View className="p-4 border rounded-2xl border-muted bg-card">
                {/* Header Row */}
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                        <SkeletonBlock width={80} height={16} className="mb-2" />
                        <SkeletonBlock width={180} height={24} />
                    </View>
                    <SkeletonBlock
                        width={80}
                        height={24}
                        rounded="rounded-full"
                    />
                </View>

                {/* Footer Row */}
                <View className="flex-row items-center justify-between pt-3 border-t border-muted">
                    <View className="flex-row items-center">
                        {[1, 2, 3].map((i) => (
                            <View
                                key={i}
                                style={{ marginLeft: i > 1 ? -12 : 0 }}
                                className="border-2 rounded-full border-card">
                                <SkeletonBlock
                                    width={32}
                                    height={32}
                                    rounded="rounded-full"
                                />
                            </View>
                        ))}
                        <SkeletonBlock width={60} height={16} className="ml-2" />
                    </View>
                    <SkeletonBlock width={70} height={24} rounded="rounded-full" />
                </View>
            </View>
        </Skeleton>
    );
}
