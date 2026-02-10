import React from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";

export default function PaymentsScreen() {
    const { colorScheme } = useColorScheme();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-border">
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
                    Payments
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}>
                <StripeConnectCard />
                <PaymentHistory />
            </ScrollView>
        </SafeAreaView>
    );
}

function StripeConnectCard() {
    const { isOnboarded, hasAccount, isLoading, error, startOnboarding } =
        useStripeConnect();
    const { colorScheme } = useColorScheme();

    if (isLoading) {
        return (
            <Skeleton>
                <View className="p-5 mb-6 border rounded-2xl border-muted bg-card">
                    <SkeletonBlock width={200} height={24} className="mb-3" />
                    <SkeletonBlock width="100%" height={16} className="mb-2" />
                    <SkeletonBlock width="80%" height={16} className="mb-4" />
                    <SkeletonBlock width="100%" height={48} rounded="rounded-xl" />
                </View>
            </Skeleton>
        );
    }

    if (isOnboarded) {
        return (
            <View className="p-5 mb-6 border rounded-2xl border-green-500/30 bg-green-500/5">
                <View className="flex-row items-center gap-3 mb-2">
                    <View className="items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
                        <Icon name="CircleCheck" size={24} color="#22c55e" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-semibold text-foreground">
                            Stripe Connected
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                            You can receive payments when you run orders
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="p-5 mb-6 border rounded-2xl border-muted bg-card">
            <View className="flex-row items-center gap-3 mb-3">
                <View className="items-center justify-center w-10 h-10 rounded-full bg-purple-500/20">
                    <Icon name="CreditCard" size={24} color="#a855f7" />
                </View>
                <Text className="text-lg font-semibold text-foreground">
                    {hasAccount ? "Complete Stripe Setup" : "Set Up Stripe"}
                </Text>
            </View>
            <Text className="mb-4 text-sm text-muted-foreground">
                Connect your Stripe account to receive payments directly from
                participants when you run orders. Setup takes about 2 minutes.
            </Text>
            {error && (
                <View className="flex-row items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10">
                    <Icon name="CircleAlert" size={16} color="#ef4444" />
                    <Text className="flex-1 text-sm text-destructive">
                        {error}
                    </Text>
                </View>
            )}
            <TouchableOpacity
                onPress={startOnboarding}
                disabled={isLoading}
                className="flex-row items-center justify-center gap-2 py-4 rounded-xl bg-primary active:opacity-80">
                {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <>
                        <Icon name="ExternalLink" size={18} color="white" />
                        <Text className="font-semibold text-white">
                            {hasAccount
                                ? "Complete Setup"
                                : "Set Up Stripe"}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

function PaymentHistory() {
    const payments = useQuery(api.stripe.getPaymentHistory);
    const { colorScheme } = useColorScheme();
    const isLoading = payments === undefined;

    if (isLoading) {
        return (
            <View>
                <Text className="mb-3 text-base font-semibold text-foreground">
                    Payment History
                </Text>
                <Skeleton>
                    <View className="gap-3">
                        {[1, 2, 3].map((i) => (
                            <View
                                key={i}
                                className="flex-row items-center p-4 border rounded-xl border-muted bg-card">
                                <SkeletonBlock
                                    width={40}
                                    height={40}
                                    rounded="rounded-full"
                                />
                                <View className="flex-1 ml-3">
                                    <SkeletonBlock
                                        width={140}
                                        height={18}
                                        className="mb-2"
                                    />
                                    <SkeletonBlock width={100} height={14} />
                                </View>
                                <SkeletonBlock width={60} height={20} />
                            </View>
                        ))}
                    </View>
                </Skeleton>
            </View>
        );
    }

    return (
        <View>
            <Text className="mb-3 text-base font-semibold text-foreground">
                Payment History
            </Text>

            {(!payments || payments.length === 0) && (
                <View className="items-center py-8">
                    <View className="items-center justify-center w-16 h-16 mb-3 rounded-2xl bg-muted">
                        <Icon
                            name="Receipt"
                            size={32}
                            color={NAV_THEME[colorScheme].border}
                        />
                    </View>
                    <Text className="text-base font-medium text-muted-foreground">
                        No payments yet
                    </Text>
                    <Text className="mt-1 text-sm text-center text-muted-foreground">
                        Payments will appear here once you pay or receive money
                    </Text>
                </View>
            )}

            {payments && payments.length > 0 && (
                <View className="gap-3">
                    {payments.map((payment) => {
                        const amountStr = (
                            Number(payment.amountInCents) / 100
                        ).toFixed(2);
                        const statusConfig = getStatusConfig(payment.status);

                        return (
                            <View
                                key={payment.id}
                                className="flex-row items-center p-4 border rounded-xl border-muted bg-card">
                                <View
                                    className={`items-center justify-center w-10 h-10 rounded-full ${
                                        payment.isPayer
                                            ? "bg-red-500/10"
                                            : "bg-green-500/10"
                                    }`}>
                                    <Icon
                                        name={
                                            payment.isPayer
                                                ? "ArrowUpRight"
                                                : "ArrowDownLeft"
                                        }
                                        size={20}
                                        color={
                                            payment.isPayer
                                                ? "#ef4444"
                                                : "#22c55e"
                                        }
                                    />
                                </View>
                                <View className="flex-1 ml-3">
                                    <Text className="text-base font-medium text-foreground">
                                        {payment.isPayer ? "Paid" : "Received"}{" "}
                                        {payment.otherUserName}
                                    </Text>
                                    <Text className="mt-0.5 text-sm text-muted-foreground">
                                        {payment.orderName} ·{" "}
                                        {new Date(
                                            payment.createdAt,
                                        ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text
                                        className={`text-base font-semibold ${
                                            payment.isPayer
                                                ? "text-red-500"
                                                : "text-green-500"
                                        }`}>
                                        {payment.isPayer ? "-" : "+"}$
                                        {amountStr}
                                    </Text>
                                    <View
                                        className={`px-2 py-0.5 rounded-full mt-1 ${statusConfig.bg}`}>
                                        <Text
                                            className={`text-xs font-medium ${statusConfig.text}`}>
                                            {statusConfig.label}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

function getStatusConfig(status: string) {
    switch (status) {
        case "succeeded":
            return {
                label: "Completed",
                bg: "bg-green-500/10",
                text: "text-green-500",
            };
        case "processing":
        case "pending":
            return {
                label: "Processing",
                bg: "bg-orange-500/10",
                text: "text-orange-500",
            };
        case "failed":
            return {
                label: "Failed",
                bg: "bg-red-500/10",
                text: "text-red-500",
            };
        case "refunded":
            return {
                label: "Refunded",
                bg: "bg-blue-500/10",
                text: "text-blue-500",
            };
        default:
            return {
                label: status,
                bg: "bg-muted",
                text: "text-muted-foreground",
            };
    }
}
