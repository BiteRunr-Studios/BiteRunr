import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon, { type IconName } from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

WebBrowser.maybeCompleteAuthSession();

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
    requirementsCurrentlyDue: string[];
    requirementsPastDue: string[];
    requirementsPendingVerification: string[];
    requirementsDisabledReason?: string | null;
    needsMoreInformation: boolean;
    verificationInReview: boolean;
    requiresIdentityDocument: boolean;
};

type SetupState = "fresh" | "incomplete" | "identity" | "review";

type SetupContent = {
    icon: IconName;
    headline: string;
    subtext: string;
    cta: string | null;
    showChecklist: boolean;
    showChargesCallout: boolean;
};

const SETUP_CONTENT: Record<SetupState, SetupContent> = {
    fresh: {
        icon: "Wallet",
        headline: "Get paid for your orders",
        subtext:
            "Takes a few minutes. You'll set up with Stripe in a secure browser, then come right back.",
        cta: "Set Up Payouts",
        showChecklist: false,
        showChargesCallout: false,
    },
    incomplete: {
        icon: "ArrowRightLeft",
        headline: "Pick up where you left off",
        subtext:
            "Stripe still needs a few details before you can receive payouts.",
        cta: "Continue with Stripe",
        showChecklist: true,
        showChargesCallout: false,
    },
    identity: {
        icon: "BadgeCheck",
        headline: "Confirm it's you",
        subtext:
            "One last step — verify your identity so money can be sent to your account.",
        cta: "Verify My Identity",
        showChecklist: true,
        showChargesCallout: true,
    },
    review: {
        icon: "ScanSearch",
        headline: "You're all set on your end",
        subtext:
            "Stripe is confirming your details. This usually wraps up quickly.",
        cta: null,
        showChecklist: true,
        showChargesCallout: false,
    },
};

const STRIPE_ONBOARDING_RETURN_PATH = "stripe-onboarding-complete";
const STRIPE_LIVENESS_FIELDS = [
    "proof_of_liveness",
    "person.verification.proof_of_liveness",
];

function sanitizeCurrencyAmount(value: number | null | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.round(value));
}

function hasIdentityVerificationRequirement(requirements: string[]): boolean {
    return requirements.some(
        (field) =>
            field.includes("verification.document") ||
            field.includes("verification.additional_document") ||
            STRIPE_LIVENESS_FIELDS.some((requirement) =>
                field.includes(requirement),
            ),
    );
}

function ProgressChecklist({
    accountCreated,
    canAcceptPayments,
    identityDone,
    inReview,
    accentColor,
    mutedColor,
}: {
    accountCreated: boolean;
    canAcceptPayments: boolean;
    identityDone: boolean;
    inReview: boolean;
    accentColor: string;
    mutedColor: string;
}) {
    const items = [
        { label: "Account created", done: accountCreated },
        { label: "People can pay you", done: canAcceptPayments },
        { label: "Identity confirmed", done: identityDone },
        ...(inReview
            ? [{ label: "Final confirmation", done: false }]
            : []),
    ];

    return (
        <View className="mt-8 w-full gap-3">
            {items.map((item) => (
                <View
                    key={item.label}
                    className="flex-row items-center gap-3">
                    <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                            backgroundColor: item.done
                                ? accentColor
                                : "transparent",
                            borderWidth: item.done ? 0 : 1.5,
                            borderColor: item.done
                                ? "transparent"
                                : mutedColor,
                        }}>
                        {item.done && (
                            <Icon
                                name="Check"
                                size={14}
                                color="#ffffff"
                            />
                        )}
                    </View>
                    <Text
                        className={`text-base ${
                            item.done
                                ? "text-foreground"
                                : "text-muted-foreground"
                        }`}>
                        {item.label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export default function PaymentsScreen() {
    const { colorScheme } = useColorScheme();
    const [isSettingUp, setIsSettingUp] = useState(false);
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

    const isLoading = connectedAccount === undefined;
    const hasStarted = !!connectedAccount;
    const canAcceptCardPayments = connectedAccount?.chargesEnabled === true;
    const canReceivePayouts = connectedAccount?.payoutsEnabled === true;
    const outstandingRequirements = [
        ...(connectedAccount?.requirementsCurrentlyDue ?? []),
        ...(connectedAccount?.requirementsPastDue ?? []),
    ];
    const requiresIdentityDocument = hasIdentityVerificationRequirement(
        outstandingRequirements,
    );
    const verificationInReview =
        outstandingRequirements.length === 0 &&
        (connectedAccount?.requirementsPendingVerification?.length ?? 0) > 0;
    const setupState: SetupState = useMemo(() => {
        if (!hasStarted) return "fresh";
        if (verificationInReview) return "review";
        if (requiresIdentityDocument) return "identity";
        return "incomplete";
    }, [hasStarted, verificationInReview, requiresIdentityDocument]);

    const setupContent = SETUP_CONTENT[setupState];

    const payoutAccentColor =
        colorScheme === "dark" ? "#c4b5fd" : "#7c3aed";
    const payoutAccentSurfaceColor =
        colorScheme === "dark" ? "rgba(196,181,253,0.12)" : "#f5f3ff";
    const payoutCalloutSurfaceColor =
        colorScheme === "dark" ? "rgba(196,181,253,0.08)" : "#ede9fe";
    const payoutIconSurfaceColor =
        colorScheme === "dark" ? "rgba(196,181,253,0.16)" : "#ede9fe";
    const checklistMutedColor =
        colorScheme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)";

    const syncStripeStatus = useCallback(
        async (showAlert = false) => {
            if (!connectedAccount) return null;
            // Status syncs reactively via Convex useQuery after webhook updates.
            let status: OnboardingStatus | null = null;
            try {
                status = await checkOnboardingStatus({});
            } catch (error) {
                if (showAlert) {
                    Alert.alert(
                        "Error",
                        error instanceof Error
                            ? error.message
                            : "Couldn't refresh your payout setup",
                    );
                }
            }

            if (!status || !showAlert) return status;

            if (status.payoutsEnabled) {
                Alert.alert(
                    "You're Ready to Get Paid",
                    "Everything looks good. You can now receive payouts in BiteRunr.",
                );
                return status;
            }

            if (status.verificationInReview) {
                Alert.alert(
                    "We're Reviewing Your Info",
                    "Stripe is reviewing your information now. We'll turn on payouts automatically once it's approved.",
                );
                return status;
            }

            if (status.requiresIdentityDocument) {
                Alert.alert(
                    "One More Step",
                    "Stripe still needs your ID or a quick selfie check before you can get paid.",
                );
                return status;
            }

            if (status.needsMoreInformation) {
                Alert.alert(
                    "Finish Setup",
                    "Stripe still needs a little more information before payouts can be turned on.",
                );
            }

            return status;
        },
        [checkOnboardingStatus, connectedAccount],
    );

    const handleSetupPayouts = async () => {
        if (verificationInReview) {
            return;
        }

        setIsSettingUp(true);
        try {
            const result = await createConnectAccount({});
            if (result.url) {
                const redirectUrl = Linking.createURL(
                    STRIPE_ONBOARDING_RETURN_PATH,
                    { scheme: "biterunr" },
                );
                await WebBrowser.openAuthSessionAsync(result.url, redirectUrl);
                await syncStripeStatus(true);
            }
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Couldn't start payout setup",
            );
        }
        setIsSettingUp(false);
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
                    : "Couldn't open payout center",
            );
        }
        setIsOpeningDashboard(false);
    };

    const fetchBalance = useCallback(async () => {
        if (!canReceivePayouts) return;
        setIsLoadingBalance(true);
        let payoutBalance: PayoutBalanceData | null = null;
        try {
            payoutBalance = await getPayoutBalance({});
        } catch {
            // Silently fail.
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
    }, [canReceivePayouts, getPayoutBalance]);

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
                                    : "Failed to create instant payout.",
                            );
                        }
                        setIsRequestingPayout(false);
                        if (!payoutResult) return;

                        const feeMessage =
                            payoutResult.fee > 0
                                ? ` (Fee: ${formatCurrency(payoutResult.fee)})`
                                : "";

                        Alert.alert(
                            "Payout Sent",
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
                      title: "Instant cash out isn't ready yet",
                      message:
                          "You don't have a debit card set up for instant cash out yet.",
                  }
                : balanceData.instantAvailable <= 0
                  ? {
                        icon: "Info" as const,
                        color: NAV_THEME[colorScheme].primary,
                        title: "Nothing is ready for instant cash out yet",
                        message: `${formatCurrency(balanceData.instantAvailable)} is ready for instant cash out right now.`,
                    }
                  : {
                        icon: "Info" as const,
                        color: NAV_THEME[colorScheme].primary,
                        title: "Instant cash out isn't available right now",
                        message:
                            "The amount ready for instant cash out is too small right now.",
                    }
            : null;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
            <View className="flex-row items-center border-b border-border px-4 py-3">
                <Pressable
                    onPress={() => router.back()}
                    className="rounded-full p-2 active:opacity-70">
                    <Icon
                        name="ChevronLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
                <Text className="ml-2 flex-1 text-xl font-semibold text-foreground">
                    Payments
                </Text>
            </View>

            {isLoading && (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator
                        color={NAV_THEME[colorScheme].primary}
                        size="large"
                    />
                </View>
            )}

            {!isLoading && (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: 36,
                        ...(canReceivePayouts
                            ? {}
                            : { flexGrow: 1 }),
                    }}
                    showsVerticalScrollIndicator={false}>
                    {!canReceivePayouts ? (
                        <Animated.View
                            key={setupState}
                            entering={FadeIn.duration(200)}
                            exiting={FadeOut.duration(150)}
                            className="flex-1 items-center px-2"
                            style={{
                                paddingTop: 48,
                                paddingBottom: 24,
                            }}>
                            {/* Hero icon */}
                            <View
                                className="h-[72px] w-[72px] items-center justify-center rounded-full"
                                style={{
                                    backgroundColor: payoutIconSurfaceColor,
                                }}>
                                <Icon
                                    name={setupContent.icon}
                                    size={32}
                                    color={payoutAccentColor}
                                />
                            </View>

                            {/* Headline */}
                            <Text
                                className="mt-6 text-center text-[28px] font-bold leading-[34px] text-foreground"
                                style={{ maxWidth: 280 }}>
                                {setupContent.headline}
                            </Text>

                            {/* Subtext */}
                            <Text
                                className="mt-3 text-center text-base leading-7 text-muted-foreground"
                                style={{ maxWidth: 300 }}>
                                {setupContent.subtext}
                            </Text>

                            {/* Progress checklist */}
                            {setupContent.showChecklist && (
                                <ProgressChecklist
                                    accountCreated={hasStarted}
                                    canAcceptPayments={canAcceptCardPayments}
                                    identityDone={
                                        setupState === "review"
                                    }
                                    inReview={setupState === "review"}
                                    accentColor={payoutAccentColor}
                                    mutedColor={checklistMutedColor}
                                />
                            )}

                            {/* Charges-enabled callout */}
                            {setupContent.showChargesCallout &&
                                canAcceptCardPayments && (
                                    <View
                                        className="mt-6 w-full rounded-2xl px-4 py-3"
                                        style={{
                                            backgroundColor:
                                                payoutCalloutSurfaceColor,
                                        }}>
                                        <Text className="text-center text-sm leading-6 text-foreground">
                                            People can already pay you in the
                                            app. This step unlocks payouts to
                                            your bank.
                                        </Text>
                                    </View>
                                )}

                            {/* CTA button */}
                            {setupContent.cta && (
                                <View className="mt-8 w-full">
                                    <Button
                                        label={setupContent.cta}
                                        icon="ArrowRight"
                                        onPress={() => {
                                            void handleSetupPayouts();
                                        }}
                                        loading={isSettingUp}
                                        color={payoutAccentColor}
                                    />
                                </View>
                            )}

                            {/* Review state: auto-sync indicator */}
                            {setupState === "review" && (
                                <View className="mt-6 flex-row items-center justify-center gap-2">
                                    <ActivityIndicator
                                        size="small"
                                        color={payoutAccentColor}
                                    />
                                    <Text className="text-sm text-muted-foreground">
                                        This page updates automatically
                                    </Text>
                                </View>
                            )}

                            {/* Trust footer */}
                            <View className="mt-auto pt-10 flex-row items-center justify-center gap-1.5">
                                <Icon
                                    name="Lock"
                                    size={12}
                                    color={
                                        colorScheme === "dark"
                                            ? "rgba(255,255,255,0.3)"
                                            : "rgba(0,0,0,0.25)"
                                    }
                                />
                                <Text
                                    className="text-xs"
                                    style={{
                                        color:
                                            colorScheme === "dark"
                                                ? "rgba(255,255,255,0.3)"
                                                : "rgba(0,0,0,0.25)",
                                    }}>
                                    Secured by Stripe · Your info stays
                                    private
                                </Text>
                            </View>
                        </Animated.View>
                    ) : (
                        <>
                            <View
                                className="mb-6 rounded-[28px] p-5"
                                style={{
                                    backgroundColor:
                                        colorScheme === "dark"
                                            ? "#1a1528"
                                            : "#f5f3ff",
                                }}>
                                <Text className="text-xs font-semibold uppercase tracking-[2px] text-muted-foreground">
                                    BiteRunr Payouts
                                </Text>
                                <Text className="mt-2 text-[30px] font-bold leading-9 text-foreground">
                                    You're ready to get paid
                                </Text>
                                <Text className="mt-3 text-base leading-6 text-muted-foreground">
                                    Track your balance and move money out
                                    below.
                                </Text>
                            </View>

                            {connectedAccount && canReceivePayouts && (
                                <View className="mb-6 rounded-[28px] border border-muted bg-card p-5">
                                <View className="mb-4 flex-row items-center gap-3">
                                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                                            <Icon
                                                name="Wallet"
                                                size={20}
                                                color="#7c3aed"
                                            />
                                        </View>
                                        <Text className="text-lg font-semibold text-foreground">
                                            Available Balance
                                        </Text>
                                    </View>

                                    {isLoadingBalance && !balanceData && (
                                        <View className="items-center py-6">
                                            <ActivityIndicator
                                                color={NAV_THEME[colorScheme].primary}
                                            />
                                        </View>
                                    )}

                                    {balanceData && (
                                        <View>
                                            <Text className="mb-1 text-3xl font-bold text-foreground">
                                                {formatCurrency(balanceData.available)}
                                            </Text>
                                            <Text className="mb-4 text-sm text-muted-foreground">
                                                Ready now
                                            </Text>

                                            {balanceData.pending > 0 && (
                                                <View className="mb-4 flex-row items-center gap-2 rounded-xl bg-muted px-3 py-2">
                                                    <Icon
                                                        name="Clock"
                                                        size={14}
                                                        color={NAV_THEME[colorScheme].text}
                                                    />
                                                    <Text className="text-sm text-foreground">
                                                        {formatCurrency(
                                                            balanceData.pending,
                                                        )}{" "}
                                                        on the way
                                                    </Text>
                                                </View>
                                            )}

                                            {balanceData.available > 0 && (
                                                <View className="mb-4 gap-2">
                                                    <View className="flex-row items-center justify-between rounded-xl bg-muted px-3 py-2">
                                                        <Text className="text-sm text-muted-foreground">
                                                            Ready for instant cash out
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
                                                        <View className="flex-row items-start gap-2 rounded-xl border border-muted bg-muted px-3 py-2">
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
                                                        onPress={handleInstantPayout}
                                                        loading={isRequestingPayout}
                                                        color="#22c55e"
                                                    />
                                                    <Button
                                                        label={`Bank Transfer: ${formatCurrency(balanceData.available)}`}
                                                        icon="Building"
                                                        variant="outline"
                                                        onPress={handleStandardPayout}
                                                        loading={
                                                            isRequestingStandardPayout
                                                        }
                                                        color={
                                                            NAV_THEME[colorScheme].primary
                                                        }
                                                    />
                                                    <Text className="text-center text-xs text-muted-foreground">
                                                        Bank transfers are free
                                                        and usually arrive in
                                                        1-2 business days.
                                                    </Text>
                                                </View>
                                            ) : showInstantPayout ? (
                                                <View className="gap-2">
                                                    <Button
                                                        label={`Instant Payout: ${formatCurrency(balanceData.instantPayoutAmount)}`}
                                                        icon="Zap"
                                                        onPress={handleInstantPayout}
                                                        loading={isRequestingPayout}
                                                        color="#22c55e"
                                                    />
                                                </View>
                                            ) : showBankTransfer ? (
                                                <View className="gap-2">
                                                    <Button
                                                        label={`Payout to Bank — ${formatCurrency(balanceData.available)}`}
                                                        icon="Building"
                                                        onPress={handleStandardPayout}
                                                        loading={
                                                            isRequestingStandardPayout
                                                        }
                                                        color="#22c55e"
                                                    />
                                                </View>
                                            ) : balanceData.available > 0 ? (
                                                <Text className="text-center text-xs text-muted-foreground">
                                                    Add a bank account or debit
                                                    card in Stripe to move your
                                                    balance out.
                                                </Text>
                                            ) : (
                                                <Text className="text-center text-xs text-muted-foreground">
                                                    Nothing here yet. Money will
                                                    show up once your group
                                                    pays.
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}

                            {connectedAccount && canAcceptCardPayments && (
                                <View className="rounded-[24px] border border-muted bg-card p-4">
                                    <View className="mb-3 flex-row items-center gap-2">
                                        <Icon
                                            name="CircleCheck"
                                            size={16}
                                            color="#7c3aed"
                                        />
                                        <Text className="text-sm text-muted-foreground">
                                            You're set up to take payments and
                                            get paid
                                        </Text>
                                    </View>
                                    <Button
                                        label="Open Stripe Account"
                                        icon="ExternalLink"
                                        variant="outline"
                                        onPress={handleOpenDashboard}
                                        loading={isOpeningDashboard}
                                        color={NAV_THEME[colorScheme].primary}
                                    />
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
