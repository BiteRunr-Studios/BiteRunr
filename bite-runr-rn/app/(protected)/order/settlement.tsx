import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

type Member = {
    orderUserId: string;
    userId: string;
    isCreator: boolean;
    firstName: string;
    lastName: string;
    email: string;
    amountOwed: bigint | number;
    settlementStatus: string;
    stripePayment: {
        status: string;
        amount: number;
    } | null;
};

function getStatusIcon(
    settlementStatus: string,
    stripePayment: { status: string } | null,
) {
    if (settlementStatus === "confirmed" || settlementStatus === "settled_in_person") {
        return { name: "CircleCheck" as const, color: "#22c55e" };
    }
    if (stripePayment) {
        switch (stripePayment.status) {
            case "pending":
                return { name: "Clock" as const, color: "#f59e0b" };
            case "failed":
            case "expired":
                return { name: "CircleX" as const, color: "#ef4444" };
            case "completed":
                return { name: "CircleCheck" as const, color: "#22c55e" };
        }
    }
    return { name: "CircleDashed" as const, color: "#9ca3af" };
}

function getStatusText(
    settlementStatus: string,
    stripePayment: { status: string } | null,
) {
    if (settlementStatus === "confirmed") return "Paid";
    if (settlementStatus === "settled_in_person") return "Settled in person";
    if (stripePayment) {
        switch (stripePayment.status) {
            case "pending":
                return "Payment pending...";
            case "completed":
                return "Paid";
            case "failed":
                return "Payment failed";
            case "expired":
                return "Payment expired";
        }
    }
    return "Unpaid";
}

function formatCents(cents: number | bigint): string {
    const num = typeof cents === "bigint" ? Number(cents) : cents;
    return `$${(num / 100).toFixed(2)}`;
}

export default function Settlement() {
    const params = useLocalSearchParams();
    const orderId = Array.isArray(params.orderId)
        ? params.orderId[0]
        : params.orderId;
    const { colorScheme } = useColorScheme();
    const [isCompleting, setIsCompleting] = useState(false);

    const paymentStatus = useQuery(
        api.payments.getOrderPaymentStatus,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    const markSettledInPerson = useMutation(api.payments.markSettledInPerson);
    const updateOrder = useMutation(api.orders.update);

    const handleCompleteOrder = async () => {
        if (!orderId) return;
        setIsCompleting(true);
        try {
            await updateOrder({
                orderId: orderId as Id<"orders">,
                status: "completed",
            });
            Alert.alert(
                "Order Complete",
                "This order has been marked as complete.",
                [
                    {
                        text: "OK",
                        onPress: () => router.dismissTo("/(protected)/(tabs)"),
                    },
                ],
            );
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to complete order",
            );
        } finally {
            setIsCompleting(false);
        }
    };

    const handleMarkSettled = (member: Member) => {
        Alert.alert(
            "Mark as Settled",
            `Confirm that ${member.firstName} ${member.lastName} has paid ${formatCents(member.amountOwed)} in person?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            await markSettledInPerson({
                                orderId: orderId as Id<"orders">,
                                orderUserId: member.orderUserId as Id<"orderUsers">,
                            });
                        } catch (error) {
                            Alert.alert(
                                "Error",
                                error instanceof Error
                                    ? error.message
                                    : "Failed to mark as settled",
                            );
                        }
                    },
                },
            ],
        );
    };

    if (paymentStatus === undefined) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-foreground">Loading...</Text>
            </View>
        );
    }

    if (paymentStatus === null) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-destructive">
                    Not authorized to view settlement
                </Text>
            </View>
        );
    }

    // Calculate totals
    const members = paymentStatus.members as Member[];
    const nonCreatorMembers = members.filter((m) => !m.isCreator);
    const totalOwed = nonCreatorMembers.reduce(
        (sum, m) => sum + Number(m.amountOwed),
        0,
    );
    const totalPaid = nonCreatorMembers
        .filter((m) => m.settlementStatus === "confirmed" || m.settlementStatus === "settled_in_person")
        .reduce((sum, m) => sum + Number(m.amountOwed), 0);
    const allSettled = nonCreatorMembers
        .filter((m) => Number(m.amountOwed) > 0)
        .every(
            (m) =>
                m.settlementStatus === "confirmed" ||
                m.settlementStatus === "settled_in_person",
        );

    return (
        <>
            <SafeAreaView edges={["top"]} />
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <View className="flex-row items-center mb-2">
                        <Pressable
                            onPress={() => router.back()}
                            className="p-2 -ml-2 rounded-full active:opacity-70">
                            <Icon
                                name="ChevronLeft"
                                size={24}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        </Pressable>
                        <Text className="flex-1 ml-2 text-xl font-bold text-foreground">
                            Settlement
                        </Text>
                    </View>
                    <Text className="text-sm text-muted-foreground">
                        {paymentStatus.orderName}
                    </Text>
                </View>

                {/* Summary Card */}
                <View className="p-4 mx-4 mt-4 rounded-2xl border border-primary/30 bg-primary/5">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-muted-foreground">
                            Total Owed
                        </Text>
                        <Text className="text-sm font-medium text-foreground">
                            {formatCents(totalOwed)}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-muted-foreground">
                            Total Paid
                        </Text>
                        <Text
                            className="text-sm font-medium text-foreground"
                            style={{ color: "#22c55e" }}>
                            {formatCents(totalPaid)}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center pt-2 border-t border-primary/20">
                        <Text className="text-base font-semibold text-foreground">
                            Outstanding
                        </Text>
                        <Text className="text-base font-semibold text-primary">
                            {formatCents(totalOwed - totalPaid)}
                        </Text>
                    </View>
                </View>

                {/* Members List */}
                <View className="flex-1 px-4 py-4">
                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
                        {nonCreatorMembers.map((member) => {
                            const statusIcon = getStatusIcon(
                                member.settlementStatus,
                                member.stripePayment,
                            );
                            const statusText = getStatusText(
                                member.settlementStatus,
                                member.stripePayment,
                            );
                            const amount = Number(member.amountOwed);

                            return (
                                <View
                                    key={member.orderUserId}
                                    className="p-4 rounded-2xl border border-muted bg-card">
                                    <View className="flex-row justify-between items-center">
                                        <View className="flex-1">
                                            <Text className="text-base font-medium text-foreground">
                                                {member.firstName}{" "}
                                                {member.lastName}
                                            </Text>
                                            <Text className="text-sm text-muted-foreground">
                                                {member.email}
                                            </Text>
                                        </View>
                                        <Text className="text-base font-semibold text-foreground">
                                            {formatCents(amount)}
                                        </Text>
                                    </View>
                                    <View className="flex-row gap-2 items-center pt-3 mt-3 border-t border-muted">
                                        <Icon
                                            name={statusIcon.name}
                                            size={16}
                                            color={statusIcon.color}
                                        />
                                        <Text
                                            className="text-sm"
                                            style={{ color: statusIcon.color }}>
                                            {statusText}
                                        </Text>
                                    </View>
                                    {amount > 0 &&
                                        member.settlementStatus !== "confirmed" &&
                                        member.settlementStatus !== "settled_in_person" && (
                                            <Pressable
                                                onPress={() =>
                                                    handleMarkSettled(member)
                                                }
                                                className="flex-row items-center gap-1.5 mt-2 active:opacity-70">
                                                <Icon
                                                    name="HandCoins"
                                                    size={14}
                                                    color={
                                                        NAV_THEME[colorScheme]
                                                            .primary
                                                    }
                                                />
                                                <Text className="text-sm font-medium text-primary">
                                                    Mark as Settled
                                                </Text>
                                            </Pressable>
                                        )}
                                </View>
                            );
                        })}

                        {nonCreatorMembers.length === 0 && (
                            <View className="justify-center items-center py-12">
                                <Text className="text-muted-foreground">
                                    No members owe money
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Footer */}
                {allSettled && (
                    <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                        <Button
                            label="Complete Order"
                            icon="CircleCheck"
                            onPress={handleCompleteOrder}
                            loading={isCompleting}
                            color="#22c55e"
                        />
                    </View>
                )}
            </View>
        </>
    );
}
