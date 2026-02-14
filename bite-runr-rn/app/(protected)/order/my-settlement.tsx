import { router, useLocalSearchParams } from "expo-router";
import {
    View,
    Text,
    Pressable,
    Alert,
    Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

type PaymentStatus =
    | "pending"
    | "initiated"
    | "payable"
    | "processing"
    | "completed"
    | "failed"
    | "expired";

function getStatusIcon(
    settlementStatus: string,
    paymentHandle: {
        status: PaymentStatus;
        errorMessage?: string | null;
    } | null,
) {
    if (settlementStatus === "confirmed" || settlementStatus === "settled_in_person") {
        return { name: "CircleCheck" as const, color: "#22c55e" };
    }
    if (paymentHandle) {
        switch (paymentHandle.status) {
            case "pending":
            case "initiated":
            case "payable":
            case "processing":
                return { name: "Clock" as const, color: "#f59e0b" };
            case "failed":
                return { name: "CircleX" as const, color: "#ef4444" };
            case "expired":
                return { name: "CircleX" as const, color: "#9ca3af" };
            case "completed":
                return { name: "CircleCheck" as const, color: "#22c55e" };
        }
    }
    return { name: "CircleDashed" as const, color: "#9ca3af" };
}

function getStatusText(
    settlementStatus: string,
    paymentHandle: {
        status: PaymentStatus;
        errorMessage?: string | null;
    } | null,
) {
    if (settlementStatus === "confirmed") return "Paid";
    if (settlementStatus === "settled_in_person") return "Settled in person";
    if (paymentHandle) {
        switch (paymentHandle.status) {
            case "pending":
                return "Sending request...";
            case "initiated":
                return "Request sent";
            case "payable":
                return "Ready to pay";
            case "processing":
                return "Processing...";
            case "completed":
                return "Paid";
            case "failed":
                return paymentHandle.errorMessage ?? "Failed";
            case "expired":
                return "Expired";
        }
    }
    return "Not requested";
}

function formatCents(cents: number | bigint): string {
    const num = typeof cents === "bigint" ? Number(cents) : cents;
    return `$${(num / 100).toFixed(2)}`;
}

export default function MySettlement() {
    const params = useLocalSearchParams();
    const orderId = Array.isArray(params.orderId)
        ? params.orderId[0]
        : params.orderId;
    const { colorScheme } = useColorScheme();

    const settlement = useQuery(
        api.paysafe.getMySettlementStatus,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    const markSettledInPerson = useMutation(api.paysafe.markSettledInPerson);

    const handleSettleInCash = () => {
        if (!settlement || !orderId) return;

        Alert.alert(
            "Settle in Cash",
            `Confirm that you have paid ${formatCents(settlement.amountOwed)} to ${settlement.creatorFirstName} ${settlement.creatorLastName} in person?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            await markSettledInPerson({
                                orderId: orderId as Id<"orders">,
                                orderUserId: settlement.orderUserId as Id<"orderUsers">,
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

    if (settlement === undefined) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-foreground">Loading...</Text>
            </View>
        );
    }

    if (settlement === null) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-destructive">
                    Not authorized to view settlement
                </Text>
            </View>
        );
    }

    const amount = Number(settlement.amountOwed);
    const statusIcon = getStatusIcon(
        settlement.settlementStatus,
        settlement.paymentHandle,
    );
    const statusText = getStatusText(
        settlement.settlementStatus,
        settlement.paymentHandle,
    );

    const canSettleInCash =
        amount > 0 &&
        settlement.settlementStatus !== "confirmed" &&
        settlement.settlementStatus !== "settled_in_person";

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
                        {settlement.orderName}
                    </Text>
                </View>

                {/* Amount Card */}
                <View className="p-4 mx-4 mt-4 rounded-2xl border border-primary/30 bg-primary/5">
                    <Text className="text-sm text-muted-foreground mb-1">
                        You owe {settlement.creatorFirstName} {settlement.creatorLastName}
                    </Text>
                    <Text className="text-3xl font-bold text-foreground">
                        {formatCents(amount)}
                    </Text>
                </View>

                {/* Status Section */}
                <View className="p-4 mx-4 mt-4 rounded-2xl border border-muted bg-card">
                    <Text className="text-sm font-medium text-muted-foreground mb-3">
                        Payment Status
                    </Text>
                    <View className="flex-row gap-2 items-center">
                        <Icon
                            name={statusIcon.name}
                            size={20}
                            color={statusIcon.color}
                        />
                        <Text
                            className="text-base font-medium"
                            style={{ color: statusIcon.color }}>
                            {statusText}
                        </Text>
                    </View>

                    {/* Payment Link */}
                    {settlement.paymentHandle?.redirectUrl &&
                        settlement.paymentHandle.status !== "completed" && (
                            <Pressable
                                onPress={() =>
                                    Linking.openURL(
                                        settlement.paymentHandle!.redirectUrl!,
                                    )
                                }
                                className="flex-row items-center gap-1.5 mt-3 pt-3 border-t border-muted active:opacity-70">
                                <Icon
                                    name="ExternalLink"
                                    size={16}
                                    color={NAV_THEME[colorScheme].primary}
                                />
                                <Text className="text-sm font-medium text-primary">
                                    Open Payment Link
                                </Text>
                            </Pressable>
                        )}
                </View>

                {/* Spacer */}
                <View className="flex-1" />

                {/* Footer */}
                {canSettleInCash && (
                    <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                        <Button
                            label="Settle in Cash"
                            icon="HandCoins"
                            onPress={handleSettleInCash}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </View>
                )}
            </View>
        </>
    );
}
