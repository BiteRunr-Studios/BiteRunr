import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

const ONBOARDING_STEPS = [
    {
        icon: "UserCheck" as const,
        title: "Verify your identity",
        desc: "Stripe will ask for your name, date of birth, and address to confirm who you are.",
    },
    {
        icon: "CreditCard" as const,
        title: "Add a debit card",
        desc: "Link a debit card for instant payouts — or a bank account if you prefer.",
    },
    {
        icon: "ShieldCheck" as const,
        title: "Quick review",
        desc: "Stripe verifies your info — this usually only takes a few minutes.",
    },
    {
        icon: "Banknote" as const,
        title: "Start getting paid",
        desc: "Once approved, order members can pay you directly with their card.",
    },
];

type PayoutBalanceData = {
    available: number;
    pending: number;
    instantAvailable: number;
    instantPayoutAmount: number;
    instantPayoutFee: number;
    hasInstantPayoutCard: boolean;
    hasBankPayoutAccount: boolean;
    instantPayoutsEnabled: boolean;
    currency: string;
};

type OnboardingStatus = {
    onboarded: boolean;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
};

function sanitizeCurrencyAmount(value: number | null | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.round(value));
}

export default function PaymentsScreen() {
    const { colorScheme } = useColorScheme();
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [isRequestingPayout, setIsRequestingPayout] = useState(false);
    const [isRequestingStandardPayout, setIsRequestingStandardPayout] =
        useState(false);
    const [balanceData, setBalanceData] = useState<PayoutBalanceData | null>(
        null,
    );

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
    const requestStandardPayout = useAction(
        api.stripeConnect.requestStandardPayout,
    );

    const showOnboardingStatusAlert = (status: OnboardingStatus) => {
        if (status.onboarded && status.chargesEnabled) {
            Alert.alert(
                "Setup Complete",
                "Your account is ready to accept card payments!",
            );
            return;
        }

        if (status.onboarded) {
            Alert.alert(
                "Almost There",
                "Your account is set up but Stripe is still verifying your details. This usually takes a few minutes.",
            );
            return;
        }

        Alert.alert(
            "Setup Incomplete",
            "You haven't finished setting up your payout account. Tap 'Continue Setup' to complete it.",
        );
    };

    const handleSetupPayouts = async () => {
        setIsSettingUp(true);
        try {
            const result = await createConnectAccount({});
            if (result.url) {
                await WebBrowser.openBrowserAsync(result.url);
                // Check status after browser closes
                setIsChecking(true);
                let status: OnboardingStatus | null = null;
                try {
                    status = await checkOnboardingStatus({});
                } catch {
                    // Status check failed silently — the webhook will update the state
                }
                setIsChecking(false);
                if (status) {
                    showOnboardingStatusAlert(status);
                }
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to start payout setup",
            );
        }
        setIsSettingUp(false);
    };

    const handleCheckStatus = async () => {
        setIsChecking(true);
        let status: OnboardingStatus | null = null;
        try {
            status = await checkOnboardingStatus({});
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to check status",
            );
        }
        setIsChecking(false);
        if (status) {
            showOnboardingStatusAlert(status);
        }
    };

    const isReady = connectedAccount?.chargesEnabled;

    const fetchBalance = useCallback(async () => {
        if (!isReady) return;
        setIsLoadingBalance(true);
        let payoutBalance: PayoutBalanceData | null = null;
        try {
            payoutBalance = await getPayoutBalance({});
        } catch {
            // Silently fail — balance card just won't show
        }
        setIsLoadingBalance(false);
        if (!payoutBalance) return;

        const instantPayoutAmount = sanitizeCurrencyAmount(
            payoutBalance.instantPayoutAmount,
        );

        setBalanceData({
            available: sanitizeCurrencyAmount(payoutBalance.available),
            pending: sanitizeCurrencyAmount(payoutBalance.pending),
            instantAvailable: sanitizeCurrencyAmount(
                payoutBalance.instantAvailable,
            ),
            instantPayoutAmount,
            instantPayoutFee: sanitizeCurrencyAmount(
                payoutBalance.instantPayoutFee,
            ),
            hasInstantPayoutCard: payoutBalance.hasInstantPayoutCard === true,
            hasBankPayoutAccount: payoutBalance.hasBankPayoutAccount === true,
            instantPayoutsEnabled:
                payoutBalance.instantPayoutsEnabled === true &&
                instantPayoutAmount > 0,
            currency: payoutBalance.currency || "cad",
        });
    }, [isReady, getPayoutBalance]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void fetchBalance();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchBalance]);

    const formatCurrency = (amount: number) => {
        return `$${(sanitizeCurrencyAmount(amount) / 100).toFixed(2)}`;
    };

    const handleInstantPayout = async () => {
        if (!balanceData || balanceData.instantPayoutAmount <= 0) return;

        Alert.alert(
            "Instant Payout",
            `Cash out to your debit card?\n\nBalance: ${formatCurrency(balanceData.instantAvailable)}\nStripe fee: -${formatCurrency(balanceData.instantPayoutFee)}\nYou'll receive: ${formatCurrency(balanceData.instantPayoutAmount)}`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Cash Out",
                    onPress: async () => {
                        setIsRequestingPayout(true);
                        let payoutResult: {
                            amount: number;
                            fee: number;
                        } | null = null;
                        try {
                            payoutResult = await requestInstantPayout({});
                        } catch (error) {
                            Alert.alert(
                                "Payout Failed",
                                error instanceof Error
                                    ? error.message
                                    : "Failed to create instant payout. Make sure you have a debit card linked to your Stripe account.",
                            );
                        }
                        setIsRequestingPayout(false);
                        if (!payoutResult) return;

                        const feeMessage =
                            payoutResult.fee > 0
                                ? ` (Fee: ${formatCurrency(payoutResult.fee)})`
                                : "";

                        Alert.alert(
                            "Payout Sent!",
                            `${formatCurrency(payoutResult.amount)} is on its way to your debit card.${feeMessage}`,
                        );
                        void fetchBalance();
                    },
                },
            ],
        );
    };

    const handleStandardPayout = async () => {
        if (
            !balanceData ||
            balanceData.available <= 0 ||
            !balanceData.hasBankPayoutAccount
        ) {
            return;
        }

        Alert.alert(
            "Payout to Bank",
            `Transfer ${formatCurrency(balanceData.available)} to your bank account?\n\nNo fees — funds typically arrive in 1-2 business days.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Transfer",
                    onPress: async () => {
                        setIsRequestingStandardPayout(true);
                        let payoutResult: { amount: number } | null = null;
                        try {
                            payoutResult = await requestStandardPayout({});
                        } catch (error) {
                            Alert.alert(
                                "Payout Failed",
                                error instanceof Error
                                    ? error.message
                                    : "Failed to create payout.",
                            );
                        }
                        setIsRequestingStandardPayout(false);
                        if (!payoutResult) return;

                        Alert.alert(
                            "Payout Initiated",
                            `${formatCurrency(payoutResult.amount)} will arrive in your bank account in 1-2 business days.`,
                        );
                        void fetchBalance();
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
        }
        setIsOpeningDashboard(false);
    };

    const isOnboarded = connectedAccount?.onboardingComplete;
    const isLoading = connectedAccount === undefined;
    const hasNoAccount = connectedAccount === null;
    const showInstantPayout =
        !!balanceData?.instantPayoutsEnabled &&
        (balanceData?.instantPayoutAmount ?? 0) > 0;
    const showBankTransfer =
        !!balanceData?.hasBankPayoutAccount && (balanceData?.available ?? 0) > 0;
    const instantPayoutStatus =
        balanceData && balanceData.available > 0 && !showInstantPayout
            ? !balanceData.hasInstantPayoutCard
                ? {
                      icon: "CircleAlert" as const,
                      color: "#f59e0b",
                      title: "Instant payout unavailable",
                      message:
                          "Stripe does not currently show an instant-eligible debit card on this account. Add or replace the payout card in Stripe to enable instant cash out.",
                  }
                : balanceData.instantAvailable <= 0
                  ? {
                        icon: "Info" as const,
                        color: NAV_THEME[colorScheme].primary,
                        title: "No instant-eligible balance yet",
                        message: `You have ${formatCurrency(balanceData.available)} available for standard payout, but Stripe is currently reporting ${formatCurrency(balanceData.instantAvailable)} as instant-eligible.`,
                    }
                  : {
                        icon: "Info" as const,
                        color: NAV_THEME[colorScheme].primary,
                        title: "Instant payout unavailable",
                        message:
                            "Your instant-eligible balance is too small to cover Stripe's instant payout fee right now.",
                    }
            : null;

    // Derive step completion from actual Stripe account state
    const getStepStatus = (index: number) => {
        if (!connectedAccount) return "pending";
        // Step 0: Verify identity — done once onboarding is submitted
        if (index === 0) return isOnboarded ? "done" : "pending";
        // Step 1: Add debit card — done once payouts are enabled
        if (index === 1) {
            if (connectedAccount.payoutsEnabled) return "done";
            return isOnboarded ? "active" : "pending";
        }
        // Step 2: Quick review — done once charges are enabled
        if (index === 2) {
            if (connectedAccount.chargesEnabled) return "done";
            if (isOnboarded) return "active";
            return "pending";
        }
        // Step 3: Start getting paid — done once everything is ready
        if (index === 3) {
            return connectedAccount.chargesEnabled ? "done" : "pending";
        }
        return "pending";
    };

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

            {isLoading && (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator
                        color={NAV_THEME[colorScheme].primary}
                        size="large"
                    />
                </View>
            )}

            {!isLoading && (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={false}>
                    {/* Card Payments Section */}
                    <View className="mb-6">
                        <View className="flex-row gap-3 items-center mb-4">
                            <View className="justify-center items-center w-10 h-10 rounded-xl bg-purple-500/10">
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

                        {hasNoAccount && (
                            <View className="p-4 rounded-2xl border border-muted bg-card">
                                <Text className="mb-1 text-base text-foreground">
                                    Get paid by your group
                                </Text>
                                <Text className="mb-4 text-sm text-muted-foreground">
                                    Set up takes about 2 minutes. Here's what to
                                    expect:
                                </Text>

                                <View className="mb-5">
                                    {ONBOARDING_STEPS.map((step, index) => (
                                        <View
                                            key={step.title}
                                            className="flex-row gap-3 items-start">
                                            {/* Step indicator line */}
                                            <View className="items-center w-8">
                                                <View
                                                    className="justify-center items-center w-8 h-8 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            NAV_THEME[
                                                                colorScheme
                                                            ].primary + "15",
                                                    }}>
                                                    <Icon
                                                        name={step.icon}
                                                        size={16}
                                                        color={
                                                            NAV_THEME[
                                                                colorScheme
                                                            ].primary
                                                        }
                                                    />
                                                </View>
                                                {index <
                                                    ONBOARDING_STEPS.length -
                                                        1 && (
                                                    <View
                                                        className="w-0.5 flex-1 my-1 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                NAV_THEME[
                                                                    colorScheme
                                                                ].primary +
                                                                "30",
                                                            minHeight: 20,
                                                        }}
                                                    />
                                                )}
                                            </View>

                                            <View className="flex-1 pb-4">
                                                <Text className="text-sm font-medium text-foreground">
                                                    {step.title}
                                                </Text>
                                                <Text className="text-xs text-muted-foreground mt-0.5">
                                                    {step.desc}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                <Button
                                    label="Get Started"
                                    icon="ArrowRight"
                                    onPress={handleSetupPayouts}
                                    loading={isSettingUp}
                                    color={NAV_THEME[colorScheme].primary}
                                />

                                <View className="flex-row items-center justify-center gap-1.5 mt-3">
                                    <Icon
                                        name="Lock"
                                        size={12}
                                        color={NAV_THEME[colorScheme].border}
                                    />
                                    <Text className="text-xs text-muted-foreground">
                                        Secured by Stripe
                                    </Text>
                                </View>
                            </View>
                        )}

                        {connectedAccount && !isReady && (
                            <View className="p-4 rounded-2xl border border-muted bg-card">
                                <View className="flex-row gap-2 items-center mb-1">
                                    <Icon
                                        name={
                                            isOnboarded
                                                ? "Clock"
                                                : "CircleAlert"
                                        }
                                        size={20}
                                        color="#f59e0b"
                                    />
                                    <Text
                                        className="text-base font-medium"
                                        style={{ color: "#f59e0b" }}>
                                        {isOnboarded
                                            ? "Verification in progress"
                                            : "Almost there"}
                                    </Text>
                                </View>
                                <Text className="mb-4 text-sm text-muted-foreground">
                                    {isOnboarded
                                        ? "Stripe is reviewing your details. This usually takes just a few minutes — check back shortly."
                                        : "You're almost done! Finish the last few steps to start accepting card payments."}
                                </Text>

                                {/* Progress steps */}
                                <View className="mb-4">
                                    {ONBOARDING_STEPS.map((step, index) => {
                                        const status = getStepStatus(index);
                                        const isDone = status === "done";
                                        const isActive = status === "active";

                                        return (
                                            <View
                                                key={step.title}
                                                className="flex-row gap-3 items-center"
                                                style={{
                                                    paddingVertical: 6,
                                                    opacity:
                                                        isDone || isActive
                                                            ? 1
                                                            : 0.4,
                                                }}>
                                                <View
                                                    className="justify-center items-center w-6 h-6 rounded-full"
                                                    style={{
                                                        backgroundColor: isDone
                                                            ? "#22c55e20"
                                                            : isActive
                                                              ? "#f59e0b20"
                                                              : NAV_THEME[
                                                                    colorScheme
                                                                ].primary +
                                                                "10",
                                                    }}>
                                                    <Icon
                                                        name={
                                                            isDone
                                                                ? "Check"
                                                                : isActive
                                                                  ? "LoaderCircle"
                                                                  : step.icon
                                                        }
                                                        size={13}
                                                        color={
                                                            isDone
                                                                ? "#22c55e"
                                                                : isActive
                                                                  ? "#f59e0b"
                                                                  : NAV_THEME[
                                                                        colorScheme
                                                                    ].primary
                                                        }
                                                    />
                                                </View>
                                                <Text
                                                    className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                                    {step.title}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                <View className="gap-3">
                                    {!isOnboarded && (
                                        <Button
                                            label="Continue Setup"
                                            icon="ArrowRight"
                                            onPress={handleSetupPayouts}
                                            loading={isSettingUp}
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
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

                        {/* Balance — hero section when ready */}
                        {connectedAccount && isReady && (
                            <View className="p-5 rounded-2xl border border-muted bg-card">
                                <View className="flex-row gap-3 items-center mb-4">
                                    <View className="justify-center items-center w-10 h-10 rounded-xl bg-green-500/10">
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
                                    <View className="items-center py-6">
                                        <ActivityIndicator
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
                                        />
                                    </View>
                                )}

                                {balanceData && (
                                    <View>
                                        <Text className="mb-1 text-3xl font-bold text-foreground">
                                            {formatCurrency(
                                                balanceData.available,
                                            )}
                                        </Text>
                                        <Text className="mb-4 text-sm text-muted-foreground">
                                            Available
                                        </Text>

                                        {balanceData.pending > 0 && (
                                            <View className="flex-row gap-2 items-center px-3 py-2 mb-4 rounded-xl bg-muted">
                                                <Icon
                                                    name="Clock"
                                                    size={14}
                                                    color={
                                                        NAV_THEME[colorScheme]
                                                            .text
                                                    }
                                                />
                                                <Text className="text-sm text-foreground">
                                                    {formatCurrency(
                                                        balanceData.pending,
                                                    )}{" "}
                                                    pending
                                                </Text>
                                            </View>
                                        )}

                                        {balanceData.available > 0 && (
                                            <View className="mb-4 gap-2">
                                                <View className="flex-row items-center justify-between px-3 py-2 rounded-xl bg-muted">
                                                    <Text className="text-sm text-muted-foreground">
                                                        Instant-eligible now
                                                    </Text>
                                                    <Text className="text-sm font-medium text-foreground">
                                                        {balanceData.hasInstantPayoutCard
                                                            ? formatCurrency(
                                                                  balanceData.instantAvailable,
                                                              )
                                                            : "No eligible card"}
                                                    </Text>
                                                </View>

                                                {instantPayoutStatus && (
                                                    <View className="flex-row gap-2 items-start px-3 py-2 rounded-xl border border-muted bg-muted">
                                                        <Icon
                                                            name={
                                                                instantPayoutStatus.icon
                                                            }
                                                            size={16}
                                                            color={
                                                                instantPayoutStatus.color
                                                            }
                                                        />
                                                        <View className="flex-1">
                                                            <Text
                                                                className="text-sm font-medium"
                                                                style={{
                                                                    color: instantPayoutStatus.color,
                                                                }}>
                                                                {
                                                                    instantPayoutStatus.title
                                                                }
                                                            </Text>
                                                            <Text className="mt-0.5 text-xs text-muted-foreground">
                                                                {
                                                                    instantPayoutStatus.message
                                                                }
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {showInstantPayout &&
                                        showBankTransfer ? (
                                            <View className="gap-2">
                                                <Button
                                                    label={`Instant Payout: ${formatCurrency(balanceData.instantPayoutAmount)}`}
                                                    icon="Zap"
                                                    onPress={
                                                        handleInstantPayout
                                                    }
                                                    loading={isRequestingPayout}
                                                    color="#22c55e"
                                                />
                                                <Button
                                                    label={`Bank Transfer: ${formatCurrency(balanceData.available)}`}
                                                    icon="Building"
                                                    variant="outline"
                                                    onPress={
                                                        handleStandardPayout
                                                    }
                                                    loading={
                                                        isRequestingStandardPayout
                                                    }
                                                    color={
                                                        NAV_THEME[colorScheme]
                                                            .primary
                                                    }
                                                />
                                                <Text className="text-xs text-center text-muted-foreground">
                                                    Bank transfers are free and
                                                    arrive in 1-2 business days.
                                                </Text>
                                            </View>
                                        ) : showInstantPayout ? (
                                            <View className="gap-2">
                                                <Button
                                                    label={`Instant Payout: ${formatCurrency(balanceData.instantPayoutAmount)}`}
                                                    icon="Zap"
                                                    onPress={
                                                        handleInstantPayout
                                                    }
                                                    loading={isRequestingPayout}
                                                    color="#22c55e"
                                                />
                                                <Text className="text-xs text-center text-muted-foreground">
                                                    Instant payouts go to your
                                                    debit card. Add a bank
                                                    account in Stripe if you
                                                    also want free standard
                                                    transfers.
                                                </Text>
                                            </View>
                                        ) : showBankTransfer ? (
                                            <View className="gap-2">
                                                <Button
                                                    label={`Payout to Bank — ${formatCurrency(balanceData.available)}`}
                                                    icon="Building"
                                                    onPress={
                                                        handleStandardPayout
                                                    }
                                                    loading={
                                                        isRequestingStandardPayout
                                                    }
                                                    color="#22c55e"
                                                />
                                                <Text className="text-xs text-center text-muted-foreground">
                                                    No fees — arrives in 1-2
                                                    business days. Instant
                                                    payout appears separately
                                                    when Stripe reports an
                                                    instant-eligible balance.
                                                </Text>
                                            </View>
                                        ) : balanceData.available > 0 ? (
                                            <View>
                                                <Text className="text-xs text-center text-muted-foreground">
                                                    {balanceData.hasInstantPayoutCard
                                                        ? "Instant payout will appear here once Stripe marks part of this balance as instant-eligible."
                                                        : "Add a bank account or an instant-eligible debit card in Stripe to cash out your balance."}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View>
                                                {balanceData.pending > 0 ? (
                                                    <Text className="text-xs text-center text-muted-foreground">
                                                        Funds are pending and
                                                        typically become
                                                        available in 1-2
                                                        business days.
                                                    </Text>
                                                ) : (
                                                    <Text className="text-xs text-center text-muted-foreground">
                                                        No balance yet. Funds
                                                        will appear here after
                                                        order members pay.
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Card payments status + dashboard button */}
                        {connectedAccount && isReady && (
                            <View className="p-4 mt-3 rounded-2xl border border-muted bg-card">
                                <View className="flex-row gap-2 items-center mb-3">
                                    <Icon
                                        name="CircleCheck"
                                        size={16}
                                        color="#22c55e"
                                    />
                                    <Text className="text-sm text-muted-foreground">
                                        Card payments active
                                    </Text>
                                </View>
                                <Button
                                    label="View Earnings & Payouts"
                                    icon="ExternalLink"
                                    variant="outline"
                                    onPress={handleOpenDashboard}
                                    loading={isOpeningDashboard}
                                    color={NAV_THEME[colorScheme].primary}
                                />
                            </View>
                        )}
                    </View>

                    {/* How it Works — only show when not yet onboarded */}
                    {connectedAccount && isReady && (
                        <View className="mt-2 mb-6">
                            <View className="flex-row gap-3 items-center mb-4">
                                <View className="justify-center items-center w-10 h-10 rounded-xl bg-blue-500/10">
                                    <Icon
                                        name="Info"
                                        size={20}
                                        color="#3b82f6"
                                    />
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
                                        desc: "Funds are deposited to your bank account.",
                                    },
                                ].map((item) => (
                                    <View
                                        key={item.title}
                                        className="flex-row gap-3 items-start p-3 rounded-xl border border-muted bg-card">
                                        <Icon
                                            name={item.icon}
                                            size={20}
                                            color={
                                                NAV_THEME[colorScheme].primary
                                            }
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
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
