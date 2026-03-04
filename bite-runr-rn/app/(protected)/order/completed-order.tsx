import { useLocalSearchParams, router } from "expo-router";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Avatar } from "@/components/common/avatar";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";

const SETTLEMENT_BADGES: Record<
    string,
    { label: string; bgClass: string; textClass: string }
> = {
    confirmed: {
        label: "Paid",
        bgClass: "bg-green-500/15",
        textClass: "text-green-600",
    },
    settled_in_person: {
        label: "Settled",
        bgClass: "bg-green-500/15",
        textClass: "text-green-600",
    },
    claimed: {
        label: "Pending",
        bgClass: "bg-yellow-500/15",
        textClass: "text-yellow-600",
    },
    unpaid: {
        label: "Unpaid",
        bgClass: "bg-red-500/15",
        textClass: "text-red-600",
    },
};

export default function CompletedOrder() {
    const { orderId } = useLocalSearchParams();
    const { colorScheme } = useColorScheme();

    const data = useQuery(
        api.orders.getCompletedOrderDetails,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    if (!data) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-row items-center gap-3 px-4 py-3">
                    <Pressable onPress={() => router.back()}>
                        <Icon
                            name="ArrowLeft"
                            size={24}
                            color={NAV_THEME[colorScheme].text}
                        />
                    </Pressable>
                    <View className="flex-1 gap-1">
                        <SkeletonBlock width={160} height={20} rounded="rounded-md" />
                        <SkeletonBlock width={100} height={14} rounded="rounded-md" />
                    </View>
                    <SkeletonBlock width={80} height={26} rounded="rounded-full" />
                </View>
                <Skeleton>
                    <View className="px-4 gap-4 mt-1">
                        {/* Stats bar skeleton */}
                        <View className="flex-row rounded-2xl border border-muted bg-card overflow-hidden">
                            {[0, 1, 2].map((i) => (
                                <View key={i} className="flex-1 items-center py-4 gap-2">
                                    <SkeletonBlock width={36} height={36} rounded="rounded-full" />
                                    <SkeletonBlock width={40} height={22} rounded="rounded-md" />
                                    <SkeletonBlock width={32} height={12} rounded="rounded-md" />
                                </View>
                            ))}
                        </View>

                        {/* Location chips skeleton */}
                        <View className="flex-row gap-2">
                            <SkeletonBlock width={100} height={28} rounded="rounded-full" />
                            <SkeletonBlock width={80} height={28} rounded="rounded-full" />
                        </View>

                        {/* Participants label */}
                        <SkeletonBlock width={90} height={16} rounded="rounded-md" />

                        {/* Participant card skeletons */}
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                className="p-4 rounded-2xl border border-muted bg-card gap-3">
                                <View className="flex-row items-center gap-3">
                                    <SkeletonBlock width={40} height={40} rounded="rounded-full" />
                                    <View className="flex-1 gap-1.5">
                                        <SkeletonBlock width={120} height={16} rounded="rounded-md" />
                                        <SkeletonBlock width={50} height={12} rounded="rounded-md" />
                                    </View>
                                    <SkeletonBlock width={60} height={24} rounded="rounded-full" />
                                </View>
                                <View className="border-t border-muted pt-3 gap-2">
                                    <View className="flex-row justify-between">
                                        <SkeletonBlock width={140} height={14} rounded="rounded-md" />
                                        <SkeletonBlock width={40} height={14} rounded="rounded-md" />
                                    </View>
                                    <View className="flex-row justify-between">
                                        <SkeletonBlock width={110} height={14} rounded="rounded-md" />
                                        <SkeletonBlock width={40} height={14} rounded="rounded-md" />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </Skeleton>
            </SafeAreaView>
        );
    }

    const statusBadge = { label: "Completed", bgClass: "bg-green-500/15", textClass: "text-green-600" };

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="flex-row items-center gap-3 px-4 py-3">
                <Pressable onPress={() => router.back()}>
                    <Icon
                        name="ArrowLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].text}
                    />
                </Pressable>
                <View className="flex-1">
                    <Text className="text-lg font-semibold text-foreground">
                        {data.order.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                        {new Date(data.order.createdAt).toLocaleDateString(
                            "en-US",
                            {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            },
                        )}
                    </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${statusBadge.bgClass}`}>
                    <Text className={`text-xs font-medium ${statusBadge.textClass}`}>
                        {statusBadge.label}
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}>
                <View className="px-4 gap-4">
                    {/* Stats Bar */}
                    <View className="flex-row rounded-2xl border border-muted bg-card overflow-hidden">
                        <View className="flex-1 items-center py-4 gap-1">
                            <View className="items-center justify-center w-9 h-9 rounded-full bg-orange-500/10">
                                <Icon
                                    name="ShoppingBag"
                                    size={16}
                                    color="#f97316"
                                />
                            </View>
                            <Text className="text-xl font-bold text-foreground">
                                {data.stats.totalItems}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                                Items
                            </Text>
                        </View>

                        <View className="my-3 border-l border-muted" />

                        <View className="flex-1 items-center py-4 gap-1">
                            <View className="items-center justify-center w-9 h-9 rounded-full bg-blue-500/10">
                                <Icon
                                    name="Users"
                                    size={16}
                                    color="#3b82f6"
                                />
                            </View>
                            <Text className="text-xl font-bold text-foreground">
                                {data.stats.participantCount}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                                People
                            </Text>
                        </View>

                        <View className="my-3 border-l border-muted" />

                        <View className="flex-1 items-center py-4 gap-1">
                            <View className="items-center justify-center w-9 h-9 rounded-full bg-green-500/10">
                                <Icon
                                    name="DollarSign"
                                    size={16}
                                    color="#22c55e"
                                />
                            </View>
                            <Text className="text-xl font-bold text-foreground">
                                $
                                {data.isCreator
                                    ? (data.stats.totalAmount / 100).toFixed(2)
                                    : (data.callerAmountOwed / 100).toFixed(2)}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                                {data.isCreator ? "Total" : "Your Total"}
                            </Text>
                        </View>
                    </View>

                    {/* Locations */}
                    {data.locations.length > 0 && (
                        <View className="flex-row flex-wrap gap-2">
                            {data.locations.map((loc) => (
                                <View
                                    key={loc.id}
                                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted">
                                    <Icon
                                        name="MapPin"
                                        size={12}
                                        color={NAV_THEME[colorScheme].text}
                                    />
                                    <Text className="text-xs font-medium text-foreground">
                                        {loc.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Participants */}
                    <View className="gap-3">
                        <Text className="text-sm font-semibold text-muted-foreground">
                            Participants
                        </Text>

                        {data.participants.map((participant) => {
                            const badge =
                                participant.isCreator
                                    ? SETTLEMENT_BADGES.confirmed
                                    : SETTLEMENT_BADGES[participant.settlementStatus] ??
                                      SETTLEMENT_BADGES.unpaid;

                            return (
                                <View
                                    key={participant.orderUserId}
                                    className="p-4 rounded-2xl border border-muted bg-card">
                                    {/* Participant Header */}
                                    <View className="flex-row items-center gap-3">
                                        <Avatar
                                            name={`${participant.firstName} ${participant.lastName}`}
                                            avatarUrl={participant.avatarUrl}
                                            size={40}
                                        />
                                        <View className="flex-1">
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-base font-semibold text-foreground">
                                                    {participant.firstName}{" "}
                                                    {participant.lastName}
                                                </Text>
                                                {participant.isCreator && (
                                                    <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15">
                                                        <Icon
                                                            name="Crown"
                                                            size={10}
                                                            color="#eab308"
                                                        />
                                                        <Text className="text-[10px] font-medium text-yellow-600">
                                                            Runner
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text className="text-xs text-muted-foreground">
                                                {participant.itemCount}{" "}
                                                {participant.itemCount === 1
                                                    ? "item"
                                                    : "items"}
                                            </Text>
                                        </View>
                                        {!participant.isCreator && (
                                            <View
                                                className={`px-2.5 py-1 rounded-full ${badge.bgClass}`}>
                                                <Text
                                                    className={`text-xs font-medium ${badge.textClass}`}>
                                                    {badge.label}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Items List */}
                                    {participant.items.length > 0 && (
                                        <View className="mt-3 pt-3 border-t border-muted gap-2">
                                            {participant.items.map(
                                                (item, idx) => (
                                                    <View
                                                        key={idx}
                                                        className="flex-row items-start justify-between">
                                                        <View className="flex-1 flex-row items-start gap-2">
                                                            <Text className="text-xs text-muted-foreground mt-0.5">
                                                                {item.quantity}x
                                                            </Text>
                                                            <View className="flex-1">
                                                                <Text className="text-sm text-foreground">
                                                                    {item.name}
                                                                </Text>
                                                                {item.comments && (
                                                                    <Text className="text-xs text-muted-foreground italic">
                                                                        {
                                                                            item.comments
                                                                        }
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                        {item.priceInCents !==
                                                            null && (
                                                            <Text className="text-sm text-muted-foreground ml-2">
                                                                $
                                                                {(
                                                                    (item.priceInCents *
                                                                        item.quantity) /
                                                                    100
                                                                ).toFixed(2)}
                                                            </Text>
                                                        )}
                                                    </View>
                                                ),
                                            )}
                                        </View>
                                    )}

                                    {/* Amount Owed */}
                                    {!participant.isCreator &&
                                        participant.amountOwed > 0 && (
                                            <View className="mt-3 pt-3 border-t border-muted flex-row justify-between items-center">
                                                <Text className="text-sm font-medium text-muted-foreground">
                                                    Amount Owed
                                                </Text>
                                                <Text className="text-sm font-semibold text-foreground">
                                                    $
                                                    {(
                                                        participant.amountOwed /
                                                        100
                                                    ).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
