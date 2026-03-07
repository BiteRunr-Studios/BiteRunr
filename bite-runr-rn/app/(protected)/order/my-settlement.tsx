import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

const PAYMENT_SHEET_COLORS = {
    light: {
        primary: "#FF8800",
        background: "#FFFFFF",
        componentBackground: "#F0F4F8",
        componentBorder: "#E0E0E0",
        componentDivider: "#E3E3E3",
        primaryText: "#020817",
        secondaryText: "#556170",
        componentText: "#020817",
        placeholderText: "#556170",
    },
    dark: {
        primary: "#FF8800",
        background: "#000000",
        componentBackground: "#1E293B",
        componentBorder: "#1E293B",
        componentDivider: "#3C3C43",
        primaryText: "#F8FAFC",
        secondaryText: "#9BA8B8",
        componentText: "#F8FAFC",
        placeholderText: "#9BA8B8",
    },
};

function getPaymentAppearance(colorScheme: "light" | "dark") {
    return {
        shapes: {
            borderRadius: 12,
            borderWidth: 0.5,
        },
        primaryButton: {
            shapes: {
                borderRadius: 20,
            },
        },
        colors: PAYMENT_SHEET_COLORS[colorScheme],
    };
}

function getStatusIcon(
    settlementStatus: string,
    stripePayment: { status: string } | null,
) {
    if (
        settlementStatus === "confirmed" ||
        settlementStatus === "settled_in_person"
    ) {
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

export default function MySettlement() {
    const params = useLocalSearchParams();
    const orderId = Array.isArray(params.orderId)
        ? params.orderId[0]
        : params.orderId;
    const { colorScheme } = useColorScheme();
    const [isPaying, setIsPaying] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const settlement = useQuery(
        api.payments.getMySettlementStatus,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    const runnerStripeStatus = useQuery(
        api.payments.getRunnerStripeStatus,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    const markSettledInPerson = useMutation(api.payments.markSettledInPerson);
    const createPaymentSheetParams = useAction(
        api.stripeConnect.createPaymentSheetParams,
    );

    const handlePayWithCard = async () => {
        if (!orderId) return;
        setIsPaying(true);
        try {
            const params = await createPaymentSheetParams({
                orderId: orderId as Id<"orders">,
            });

            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: params.paymentIntentClientSecret,
                customerEphemeralKeySecret: params.ephemeralKeySecret,
                customerId: params.customerId,
                merchantDisplayName: "BiteRunr",
                returnURL: "biterunr://stripe-redirect",
                appearance: getPaymentAppearance(colorScheme),
                applePay: {
                    merchantCountryCode: "CA",
                },
                googlePay: {
                    merchantCountryCode: "CA",
                    testEnv: __DEV__,
                },
            });

            if (initError) {
                Alert.alert("Error", initError.message);
                return;
            }

            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                // User cancelled — not a real error
                if (presentError.code === "Canceled") return;
                Alert.alert("Payment Failed", presentError.message);
            }
            // On success, the webhook handles updating the payment status
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to create payment",
            );
        } finally {
            setIsPaying(false);
        }
    };

    const handleSettleInCash = () => {
        if (!settlement || !orderId) return;

        Alert.alert(
            "Settle in Cash",
            `Confirm that you have paid ${formatCents(settlement.amountOwed)} to ${settlement.creatorFirstName} ${settlement.creatorLastName} in person?\n\nNo service fee applies for cash settlements.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            await markSettledInPerson({
                                orderId: orderId as Id<"orders">,
                                orderUserId:
                                    settlement.orderUserId as Id<"orderUsers">,
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
    const serviceFee = settlement.serviceFee;
    const totalWithFee = settlement.totalWithFee;
    const statusIcon = getStatusIcon(
        settlement.settlementStatus,
        settlement.stripePayment,
    );
    const statusText = getStatusText(
        settlement.settlementStatus,
        settlement.stripePayment,
    );

    const isSettled =
        settlement.settlementStatus === "confirmed" ||
        settlement.settlementStatus === "settled_in_person";
    const canPay = amount > 0 && !isSettled;
    const runnerAcceptsCards = runnerStripeStatus?.acceptsCards ?? false;

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
                    {amount > 0 ? (
                        <>
                            <Text className="mb-1 text-sm text-muted-foreground">
                                You owe {settlement.creatorFirstName}{" "}
                                {settlement.creatorLastName}
                            </Text>
                            {settlement.settlementStatus === "settled_in_person" || (!runnerAcceptsCards && !isSettled) ? (
                                <Text className="mt-1 text-3xl font-bold text-foreground">
                                    {formatCents(amount)}
                                </Text>
                            ) : (
                                <>
                                    <Text className="text-lg text-foreground">
                                        Their share: {formatCents(amount)}
                                    </Text>
                                    <Text className="text-lg text-muted-foreground">
                                        Service fee: {formatCents(serviceFee)}
                                    </Text>
                                    <Text className="mt-1 text-3xl font-bold text-foreground">
                                        Total: {formatCents(totalWithFee)}
                                    </Text>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <Text className="mb-1 text-sm text-muted-foreground">
                                Nothing owed
                            </Text>
                            <Text className="text-3xl font-bold text-foreground">
                                {formatCents(0)}
                            </Text>
                        </>
                    )}
                </View>

                {/* Status Section */}
                <View className="p-4 mx-4 mt-4 rounded-2xl border border-muted bg-card">
                    <Text className="mb-3 text-sm font-medium text-muted-foreground">
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
                </View>

                {/* Spacer */}
                <View className="flex-1" />

                {/* Footer Actions */}
                {canPay && (
                    <View className="gap-3 px-6 pt-4 pb-10 border-t border-muted bg-background">
                        {runnerAcceptsCards && (
                            <Button
                                label="Pay with Card"
                                icon="CreditCard"
                                onPress={handlePayWithCard}
                                loading={isPaying}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        )}
                        <Button
                            label="Settle in Cash"
                            icon="HandCoins"
                            onPress={handleSettleInCash}
                            color={
                                runnerAcceptsCards
                                    ? NAV_THEME[colorScheme].border
                                    : NAV_THEME[colorScheme].primary
                            }
                        />
                    </View>
                )}
            </View>
        </>
    );
}
