import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function PaymentsScreen() {
    const { colorScheme } = useColorScheme();
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [isRequestingPayout, setIsRequestingPayout] = useState(false);
    const [balanceData, setBalanceData] = useState<{
        available: number;
        pending: number;
        instantAvailable: number;
        instantPayoutsEnabled: boolean;
        currency: string;
    } | null>(null);

    const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
    const createConnectAccount = useAction(
        api.stripeConnect.createConnectAccount,
    );
    const checkOnboardingStatus = useAction(
        api.stripeConnect.checkOnboardingStatus,
    );
    const createDashboardLink = useAction(
        api.stripeConnect.createDashboardLink,
    );
    const getPayoutBalance = useAction(api.stripeConnect.getPayoutBalance);
    const requestInstantPayout = useAction(
        api.stripeConnect.requestInstantPayout,
    );

    const handleSetupPayouts = async () => {
        setIsSettingUp(true);
        try {
            const result = await createConnectAccount({});
            if (result.url) {
                await WebBrowser.openAuthSessionAsync(
                    result.url,
                    "biterunr://stripe-onboarding-",
                );
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to start payout setup",
            );
        } finally {
            setIsSettingUp(false);
        }
    };

    const handleCheckStatus = async () => {
        setIsChecking(true);
        try {
            const status = await checkOnboardingStatus({});
            if (status.onboarded && status.chargesEnabled) {
                Alert.alert(
                    "Setup Complete",
                    "Your account is ready to accept card payments!",
                );
            } else if (status.onboarded) {
                Alert.alert(
                    "Almost There",
                    "Your account is set up but Stripe is still verifying your details. This usually takes a few minutes.",
                );
            } else {
                Alert.alert(
                    "Setup Incomplete",
                    "You haven't finished setting up your payout account. Tap 'Continue Setup' to complete it.",
                );
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to check status",
            );
        } finally {
            setIsChecking(false);
        }
    };

    const isReady = connectedAccount?.chargesEnabled;

    const fetchBalance = useCallback(async () => {
        if (!isReady) return;
        setIsLoadingBalance(true);
        try {
            const result = await getPayoutBalance({});
            setBalanceData(result);
        } catch {
            // Silently fail — balance card just won't show
        } finally {
            setIsLoadingBalance(false);
        }
    }, [isReady, getPayoutBalance]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    const formatCurrency = (amount: number) => {
        return `$${(amount / 100).toFixed(2)}`;
    };

    const handleInstantPayout = async () => {
        if (!balanceData || balanceData.instantAvailable <= 0) return;

        Alert.alert(
            "Instant Payout",
            `Cash out ${formatCurrency(balanceData.instantAvailable)} instantly to your debit card? A small fee (typically 1%) will be deducted by Stripe.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Cash Out",
                    onPress: async () => {
                        setIsRequestingPayout(true);
                        try {
                            const result = await requestInstantPayout({});
                            Alert.alert(
                                "Payout Sent!",
                                `${formatCurrency(result.amount)} is on its way to your debit card.${result.fee > 0 ? ` (Fee: ${formatCurrency(result.fee)})` : ""}`,
                            );
                            // Refresh balance after payout
                            fetchBalance();
                        } catch (error) {
                            Alert.alert(
                                "Payout Failed",
                                error instanceof Error
                                    ? error.message
                                    : "Failed to create instant payout. Make sure you have a debit card linked to your Stripe account.",
                            );
                        } finally {
                            setIsRequestingPayout(false);
                        }
                    },
                },
            ],
        );
    };

    const handleOpenDashboard = async () => {
        setIsOpeningDashboard(true);
        try {
            const result = await createDashboardLink({});
            if (result.url) {
                await WebBrowser.openBrowserAsync(result.url);
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to open dashboard",
            );
        } finally {
            setIsOpeningDashboard(false);
        }
    };

    const isOnboarded = connectedAccount?.onboardingComplete;

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
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}>
                {/* Card Payments Section */}
                <View className="mb-6">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10">
                            <Icon
                                name="CreditCard"
                                size={20}
                                color="#a855f7"
                            />
                        </View>
                        <Text className="text-lg font-semibold text-foreground">
                            Accept Card Payments
                        </Text>
                    </View>

                    {!connectedAccount && (
                        <View className="p-4 border rounded-2xl border-muted bg-card">
                            <Text className="text-base text-foreground mb-2">
                                Set up card payments so order members can pay you
                                directly with their credit or debit card.
                            </Text>
                            <Text className="text-sm text-muted-foreground mb-4">
                                Powered by Stripe. You'll need to verify your
                                identity and add a bank account or debit card for
                                payouts.
                            </Text>
                            <Button
                                label="Set Up Card Payments"
                                icon="CreditCard"
                                onPress={handleSetupPayouts}
                                loading={isSettingUp}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        </View>
                    )}

                    {connectedAccount && !isReady && (
                        <View className="p-4 border rounded-2xl border-muted bg-card">
                            <View className="flex-row gap-2 items-center mb-3">
                                <Icon
                                    name="Clock"
                                    size={20}
                                    color="#f59e0b"
                                />
                                <Text
                                    className="text-base font-medium"
                                    style={{ color: "#f59e0b" }}>
                                    {isOnboarded
                                        ? "Verification in progress"
                                        : "Setup incomplete"}
                                </Text>
                            </View>
                            <Text className="text-sm text-muted-foreground mb-4">
                                {isOnboarded
                                    ? "Stripe is verifying your details. This usually takes a few minutes."
                                    : "You haven't finished setting up your payout account. Complete the setup to start accepting card payments."}
                            </Text>
                            <View className="gap-3">
                                {!isOnboarded && (
                                    <Button
                                        label="Continue Setup"
                                        icon="ArrowRight"
                                        onPress={handleSetupPayouts}
                                        loading={isSettingUp}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                )}
                                <Button
                                    label="Check Status"
                                    icon="RefreshCw"
                                    onPress={handleCheckStatus}
                                    loading={isChecking}
                                    color={NAV_THEME[colorScheme].border}
                                />
                            </View>
                        </View>
                    )}

                    {connectedAccount && isReady && (
                        <View className="p-4 border rounded-2xl border-muted bg-card">
                            <View className="flex-row gap-2 items-center mb-3">
                                <Icon
                                    name="CircleCheck"
                                    size={20}
                                    color="#22c55e"
                                />
                                <Text
                                    className="text-base font-medium"
                                    style={{ color: "#22c55e" }}>
                                    Card payments active
                                </Text>
                            </View>
                            <Text className="text-sm text-muted-foreground mb-4">
                                Order members can pay you with their credit or
                                debit card. Funds are deposited to your connected
                                account.
                            </Text>
                            <Button
                                label="View Earnings & Payouts"
                                icon="ExternalLink"
                                onPress={handleOpenDashboard}
                                loading={isOpeningDashboard}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        </View>
                    )}

                    {/* Balance & Instant Payout */}
                    {connectedAccount && isReady && (
                        <View className="mt-4 p-4 border rounded-2xl border-muted bg-card">
                            <View className="flex-row items-center gap-3 mb-3">
                                <View className="items-center justify-center w-10 h-10 rounded-xl bg-green-500/10">
                                    <Icon
                                        name="Wallet"
                                        size={20}
                                        color="#22c55e"
                                    />
                                </View>
                                <Text className="text-lg font-semibold text-foreground">
                                    Your Balance
                                </Text>
                            </View>

                            {isLoadingBalance && !balanceData && (
                                <View className="items-center py-4">
                                    <ActivityIndicator
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                            )}

                            {balanceData && (
                                <View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm text-muted-foreground">
                                            Available
                                        </Text>
                                        <Text className="text-base font-semibold text-foreground">
                                            {formatCurrency(
                                                balanceData.available,
                                            )}
                                        </Text>
                                    </View>
                                    {balanceData.pending > 0 && (
                                        <View className="flex-row justify-between mb-3">
                                            <Text className="text-sm text-muted-foreground">
                                                Pending
                                            </Text>
                                            <Text className="text-sm text-muted-foreground">
                                                {formatCurrency(
                                                    balanceData.pending,
                                                )}
                                            </Text>
                                        </View>
                                    )}

                                    {balanceData.available > 0 &&
                                    balanceData.instantPayoutsEnabled ? (
                                        <Button
                                            label={`Instant Payout — ${formatCurrency(balanceData.instantAvailable)}`}
                                            icon="Zap"
                                            onPress={handleInstantPayout}
                                            loading={isRequestingPayout}
                                            color="#22c55e"
                                        />
                                    ) : (
                                        <View className="mt-2">
                                            {balanceData.available === 0 &&
                                            balanceData.pending > 0 ? (
                                                <Text className="text-xs text-muted-foreground text-center">
                                                    Funds are pending and
                                                    typically become available in
                                                    1-2 business days.
                                                </Text>
                                            ) : balanceData.available === 0 &&
                                              balanceData.pending === 0 ? (
                                                <Text className="text-xs text-muted-foreground text-center">
                                                    No balance yet. Funds will
                                                    appear here after order
                                                    members pay.
                                                </Text>
                                            ) : (
                                                <Text className="text-xs text-muted-foreground text-center">
                                                    Instant payouts require a
                                                    debit card linked in Stripe.
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Info Section */}
                <View className="mb-6">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10">
                            <Icon name="Info" size={20} color="#3b82f6" />
                        </View>
                        <Text className="text-lg font-semibold text-foreground">
                            How it Works
                        </Text>
                    </View>

                    <View className="gap-3">
                        {[
                            {
                                icon: "ShoppingBag" as const,
                                title: "You run the order",
                                desc: "Pick up food for your group as the runner.",
                            },
                            {
                                icon: "CreditCard" as const,
                                title: "Members pay you",
                                desc: "Each member can pay their share with a credit or debit card.",
                            },
                            {
                                icon: "Banknote" as const,
                                title: "You get paid",
                                desc: "Funds are deposited to your bank account or debit card.",
                            },
                        ].map((item) => (
                            <View
                                key={item.title}
                                className="flex-row items-start gap-3 p-3 border rounded-xl border-muted bg-card">
                                <Icon
                                    name={item.icon}
                                    size={20}
                                    color={NAV_THEME[colorScheme].primary}
                                />
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-foreground">
                                        {item.title}
                                    </Text>
                                    <Text className="text-sm text-muted-foreground">
                                        {item.desc}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
