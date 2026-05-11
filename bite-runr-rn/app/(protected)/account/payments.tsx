import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Alert,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
import { BrText, BrAvatar } from "@/components/br";
import Animated, {
    FadeInUp,
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
} from "react-native-reanimated";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// ── Types ────────────────────────────────────────────────────────

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

// ── Utilities ────────────────────────────────────────────────────

function sanitizeCurrencyAmount(value: number | null | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.round(value));
}

function formatCurrency(amount: number): string {
    return `$${(sanitizeCurrencyAmount(amount) / 100).toFixed(2)}`;
}

// ── Setup steps (no account + pending states) ─────────────────────

const ONBOARDING_STEPS = [
    { icon: "UserCheck" as const, title: "Verify your identity",   desc: "Stripe will ask for your name, date of birth, and address." },
    { icon: "CreditCard" as const, title: "Add a debit card",      desc: "Link a debit card for instant payouts — or a bank account." },
    { icon: "ShieldCheck" as const, title: "Quick review",         desc: "Stripe verifies your info — usually takes a few minutes." },
    { icon: "Banknote" as const, title: "Start getting paid",      desc: "Once approved, squad members can pay you by card." },
];

const HOW_IT_WORKS = [
    { icon: "ShoppingBag" as const, color: BR.orange,  title: "You run the order", sub: "Pick up food for your squad as the runner." },
    { icon: "CreditCard" as const,  color: BR.lilac,   title: "Squad pays you",    sub: "Each member taps to pay their share by card." },
    { icon: "Wallet" as const,      color: BR.mint,    title: "You get paid",      sub: "Funds land in your bank account in 1–2 days." },
];

// ── Main screen ──────────────────────────────────────────────────

export default function PaymentsScreen() {
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [isRequestingPayout, setIsRequestingPayout] = useState(false);
    const [isRequestingStandardPayout, setIsRequestingStandardPayout] = useState(false);
    const [balanceData, setBalanceData] = useState<PayoutBalanceData | null>(null);

    // Animated counter for the balance number
    const balanceSv = useSharedValue(0);
    const animatedBalanceProps = useAnimatedProps(() => ({
        defaultValue: `$${balanceSv.value.toFixed(2)}`,
    }));

    useEffect(() => {
        if (balanceData !== null) {
            balanceSv.value = 0;
            balanceSv.value = withTiming(balanceData.available / 100, {
                duration: 900,
                easing: Easing.out(Easing.cubic),
            });
        }
    }, [balanceData?.available]);

    const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
    const createConnectAccount = useAction(api.stripeConnect.createConnectAccount);
    const checkOnboardingStatus = useAction(api.stripeConnect.checkOnboardingStatus);
    const createDashboardLink = useAction(api.stripeConnect.createDashboardLink);
    const getPayoutBalance = useAction(api.stripeConnect.getPayoutBalance);
    const requestInstantPayout = useAction(api.stripeConnect.requestInstantPayout);
    const requestStandardPayout = useAction(api.stripeConnect.requestStandardPayout);

    const showOnboardingStatusAlert = (status: OnboardingStatus) => {
        if (status.onboarded && status.chargesEnabled) {
            Alert.alert("Setup Complete", "Your account is ready to accept card payments!");
            return;
        }
        if (status.onboarded) {
            Alert.alert("Almost There", "Your account is set up but Stripe is still verifying your details. This usually takes a few minutes.");
            return;
        }
        Alert.alert("Setup Incomplete", "You haven't finished setting up your payout account. Tap 'Continue Setup' to complete it.");
    };

    const handleSetupPayouts = async () => {
        setIsSettingUp(true);
        try {
            const result = await createConnectAccount({});
            if (result.url) {
                await WebBrowser.openBrowserAsync(result.url);
                setIsChecking(true);
                let status: OnboardingStatus | null = null;
                try { status = await checkOnboardingStatus({}); } catch { /* webhook will update */ }
                setIsChecking(false);
                if (status) showOnboardingStatusAlert(status);
            }
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to start payout setup");
        }
        setIsSettingUp(false);
    };

    const handleCheckStatus = async () => {
        setIsChecking(true);
        let status: OnboardingStatus | null = null;
        try { status = await checkOnboardingStatus({}); } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to check status");
        }
        setIsChecking(false);
        if (status) showOnboardingStatusAlert(status);
    };

    const isReady = connectedAccount?.chargesEnabled;
    const isOnboarded = connectedAccount?.onboardingComplete;
    const isLoading = connectedAccount === undefined;
    const hasNoAccount = connectedAccount === null;

    const fetchBalance = useCallback(async () => {
        if (!isReady) return;
        setIsLoadingBalance(true);
        let payoutBalance: PayoutBalanceData | null = null;
        try { payoutBalance = await getPayoutBalance({}); } catch { /* silently fail */ }
        setIsLoadingBalance(false);
        if (!payoutBalance) return;
        const instantPayoutAmount = sanitizeCurrencyAmount(payoutBalance.instantPayoutAmount);
        setBalanceData({
            available: sanitizeCurrencyAmount(payoutBalance.available),
            pending: sanitizeCurrencyAmount(payoutBalance.pending),
            instantAvailable: sanitizeCurrencyAmount(payoutBalance.instantAvailable),
            instantPayoutAmount,
            instantPayoutFee: sanitizeCurrencyAmount(payoutBalance.instantPayoutFee),
            hasInstantPayoutCard: payoutBalance.hasInstantPayoutCard === true,
            hasBankPayoutAccount: payoutBalance.hasBankPayoutAccount === true,
            instantPayoutsEnabled: payoutBalance.instantPayoutsEnabled === true && instantPayoutAmount > 0,
            currency: payoutBalance.currency || "cad",
        });
    }, [isReady, getPayoutBalance]);

    useEffect(() => {
        const id = setTimeout(() => void fetchBalance(), 0);
        return () => clearTimeout(id);
    }, [fetchBalance]);

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
                        let payoutResult: { amount: number; fee: number } | null = null;
                        try { payoutResult = await requestInstantPayout({}); } catch (error) {
                            Alert.alert("Payout Failed", error instanceof Error ? error.message : "Failed to create instant payout.");
                        }
                        setIsRequestingPayout(false);
                        if (!payoutResult) return;
                        const feeMsg = payoutResult.fee > 0 ? ` (Fee: ${formatCurrency(payoutResult.fee)})` : "";
                        Alert.alert("Payout Sent!", `${formatCurrency(payoutResult.amount)} is on its way to your debit card.${feeMsg}`);
                        void fetchBalance();
                    },
                },
            ],
        );
    };

    const handleStandardPayout = async () => {
        if (!balanceData || balanceData.available <= 0 || !balanceData.hasBankPayoutAccount) return;
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
                        try { payoutResult = await requestStandardPayout({}); } catch (error) {
                            Alert.alert("Payout Failed", error instanceof Error ? error.message : "Failed to create payout.");
                        }
                        setIsRequestingStandardPayout(false);
                        if (!payoutResult) return;
                        Alert.alert("Payout Initiated", `${formatCurrency(payoutResult.amount)} will arrive in your bank account in 1-2 business days.`);
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
            if (result.url) await WebBrowser.openBrowserAsync(result.url);
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to open dashboard");
        }
        setIsOpeningDashboard(false);
    };

    const getStepStatus = (index: number) => {
        if (!connectedAccount) return "pending";
        if (index === 0) return isOnboarded ? "done" : "pending";
        if (index === 1) return connectedAccount.payoutsEnabled ? "done" : isOnboarded ? "active" : "pending";
        if (index === 2) return connectedAccount.chargesEnabled ? "done" : isOnboarded ? "active" : "pending";
        if (index === 3) return connectedAccount.chargesEnabled ? "done" : "pending";
        return "pending";
    };

    const showInstantPayout = !!balanceData?.instantPayoutsEnabled && (balanceData?.instantPayoutAmount ?? 0) > 0;
    const showBankTransfer = !!balanceData?.hasBankPayoutAccount && (balanceData?.available ?? 0) > 0;
    const availableBalance = balanceData?.available ?? 0;
    const isEmpty = availableBalance <= 0;

    // ── Render ────────────────────────────────────────────────────

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BR.paper }}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Icon name="ChevronLeft" size={20} color={BR.ink} />
                </Pressable>
                <BrText weight="bold" style={{ fontSize: 17 }}>Payments</BrText>
                <View style={styles.stripeBadge}>
                    <Icon name="ShieldCheck" size={11} color={BR.mintInk} />
                    <Text style={styles.stripeBadgeText}>Stripe</Text>
                </View>
            </View>

            {isLoading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={BR.orange} size="large" />
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Intro */}
                    <Animated.View entering={FadeInUp.duration(300)} style={{ marginTop: 4 }}>
                        <Text style={styles.eyebrow}>Get paid back</Text>
                        <Text style={styles.pageTitle}>
                            Accept card{" "}
                            <Text style={styles.pageTitleAccent}>payments.</Text>
                        </Text>
                        <Text style={styles.introBody}>
                            When you're the runner, your squad pays their share through BiteRunr. We deposit it straight to your bank.
                        </Text>
                    </Animated.View>

                    {/* ── No account: setup CTA ── */}
                    {hasNoAccount && (
                        <Animated.View entering={FadeInUp.duration(300).delay(60)} style={{ marginTop: 24 }}>
                            <View style={styles.setupCard}>
                                <Text style={styles.setupCardTitle}>Set up in ~2 min</Text>
                                <Text style={styles.setupCardSub}>Here's what to expect:</Text>

                                <View style={{ marginTop: 18, gap: 16 }}>
                                    {ONBOARDING_STEPS.map((step, i) => (
                                        <View key={step.title} style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                                            <View style={styles.setupStepIcon}>
                                                <Icon name={step.icon} size={16} color={BR.orangeDeep} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.setupStepTitle}>{step.title}</Text>
                                                <Text style={styles.setupStepDesc}>{step.desc}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    onPress={handleSetupPayouts}
                                    disabled={isSettingUp}
                                    style={[styles.primaryBtn, { marginTop: 22, opacity: isSettingUp ? 0.7 : 1 }]}
                                    activeOpacity={0.85}
                                >
                                    {isSettingUp
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Icon name="ArrowRight" size={18} color="#fff" />}
                                    <Text style={styles.primaryBtnText}>
                                        {isSettingUp ? "Opening Stripe…" : "Get started"}
                                    </Text>
                                </TouchableOpacity>

                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
                                    <Icon name="Lock" size={11} color={BR.ink3} />
                                    <Text style={{ fontSize: 11, color: BR.ink3, fontFamily: BR_FONT.mono }}>Secured by Stripe</Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* ── Pending: progress stepper ── */}
                    {connectedAccount && !isReady && (
                        <Animated.View entering={FadeInUp.duration(300).delay(60)} style={{ marginTop: 24 }}>
                            <View style={styles.setupCard}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <Icon name={isOnboarded ? "Clock" : "CircleAlert"} size={18} color={BR.yolk} />
                                    <Text style={[styles.setupCardTitle, { color: "#7A4A20" }]}>
                                        {isOnboarded ? "Verification in progress" : "Almost there"}
                                    </Text>
                                </View>
                                <Text style={styles.setupCardSub}>
                                    {isOnboarded
                                        ? "Stripe is reviewing your details. This usually takes just a few minutes — check back shortly."
                                        : "You're almost done! Finish the last few steps to start accepting card payments."}
                                </Text>

                                <View style={{ marginTop: 18, gap: 10 }}>
                                    {ONBOARDING_STEPS.map((step, i) => {
                                        const status = getStepStatus(i);
                                        const isDone = status === "done";
                                        const isActive = status === "active";
                                        return (
                                            <View
                                                key={step.title}
                                                style={[styles.progressStep, { opacity: isDone || isActive ? 1 : 0.4 }]}
                                            >
                                                <View style={[
                                                    styles.progressStepIcon,
                                                    isDone && { backgroundColor: BR.mintSoft },
                                                    isActive && { backgroundColor: BR.yolkSoft },
                                                ]}>
                                                    <Icon
                                                        name={isDone ? "Check" : isActive ? "LoaderCircle" : step.icon}
                                                        size={13}
                                                        color={isDone ? BR.mint : isActive ? BR.yolk : BR.ink3}
                                                        strokeWidth={isDone ? 3 : 2}
                                                    />
                                                </View>
                                                <Text style={[
                                                    styles.progressStepText,
                                                    isDone && { textDecorationLine: "line-through", color: BR.ink3 },
                                                ]}>
                                                    {step.title}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={{ gap: 10, marginTop: 20 }}>
                                    {!isOnboarded && (
                                        <TouchableOpacity
                                            onPress={handleSetupPayouts}
                                            disabled={isSettingUp}
                                            style={[styles.primaryBtn, { opacity: isSettingUp ? 0.7 : 1 }]}
                                            activeOpacity={0.85}
                                        >
                                            {isSettingUp
                                                ? <ActivityIndicator color="#fff" size="small" />
                                                : <Icon name="ArrowRight" size={18} color="#fff" />}
                                            <Text style={styles.primaryBtnText}>
                                                {isSettingUp ? "Opening Stripe…" : "Continue setup"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        onPress={handleCheckStatus}
                                        disabled={isChecking}
                                        style={[styles.ghostBtn, { opacity: isChecking ? 0.7 : 1 }]}
                                        activeOpacity={0.85}
                                    >
                                        {isChecking
                                            ? <ActivityIndicator color={BR.ink} size="small" />
                                            : <Icon name="RefreshCw" size={16} color={BR.ink} />}
                                        <Text style={styles.ghostBtnText}>
                                            {isChecking ? "Checking…" : "Check status"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* ── Ready: balance hero ── */}
                    {isReady && (
                        <>
                            <Animated.View entering={FadeInUp.duration(300).delay(60)} style={{ marginTop: 24 }}>
                                <View style={styles.balanceCard}>
                                    {/* Decorative $ watermark */}
                                    <Text style={styles.balanceWatermark} aria-hidden>$</Text>

                                    {/* Active badge */}
                                    <View style={styles.activeBadge}>
                                        <View style={styles.activeDot} />
                                        <Text style={styles.activeBadgeText}>Card payments active</Text>
                                    </View>

                                    <View style={{ marginTop: 18 }}>
                                        <Text style={styles.balanceEyebrow}>Available balance</Text>
                                        <AnimatedTextInput
                                            animatedProps={animatedBalanceProps}
                                            editable={false}
                                            style={styles.balanceAmount}
                                        />
                                        <Text style={styles.balanceCurrency}>
                                            {balanceData?.currency?.toUpperCase() ?? "USD"} · synced with Stripe
                                        </Text>
                                    </View>

                                    {balanceData && !isEmpty && (
                                        <>
                                            {balanceData.pending > 0 && (
                                                <Text style={styles.pendingNote}>
                                                    {formatCurrency(balanceData.pending)} pending
                                                </Text>
                                            )}
                                            <Text style={styles.payoutNote}>
                                                Next payout · <Text style={{ color: BR.ink }}>Tomorrow</Text>
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </Animated.View>

                            {/* Payout buttons */}
                            {balanceData && !isEmpty && (
                                <Animated.View entering={FadeInUp.duration(300).delay(80)} style={{ gap: 10, marginTop: 12 }}>
                                    {showInstantPayout && (
                                        <TouchableOpacity
                                            onPress={handleInstantPayout}
                                            disabled={isRequestingPayout}
                                            style={[styles.primaryBtn, { backgroundColor: BR.mint, opacity: isRequestingPayout ? 0.7 : 1 }]}
                                            activeOpacity={0.85}
                                        >
                                            {isRequestingPayout
                                                ? <ActivityIndicator color="#fff" size="small" />
                                                : <Icon name="Zap" size={18} color="#fff" />}
                                            <Text style={styles.primaryBtnText}>
                                                Instant payout · {formatCurrency(balanceData.instantPayoutAmount)}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    {showBankTransfer && (
                                        <TouchableOpacity
                                            onPress={handleStandardPayout}
                                            disabled={isRequestingStandardPayout}
                                            style={[styles.ghostBtn, { opacity: isRequestingStandardPayout ? 0.7 : 1 }]}
                                            activeOpacity={0.85}
                                        >
                                            {isRequestingStandardPayout
                                                ? <ActivityIndicator color={BR.ink} size="small" />
                                                : <Icon name="Building" size={16} color={BR.ink} />}
                                            <Text style={styles.ghostBtnText}>
                                                Bank transfer · {formatCurrency(balanceData.available)}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </Animated.View>
                            )}

                            {/* Stripe dashboard button */}
                            <Animated.View entering={FadeInUp.duration(300).delay(100)} style={{ marginTop: 12 }}>
                                <TouchableOpacity
                                    onPress={handleOpenDashboard}
                                    disabled={isOpeningDashboard}
                                    style={[styles.dashboardBtn, { opacity: isOpeningDashboard ? 0.7 : 1 }]}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.dashboardBtnIcon}>
                                        <Icon name="TrendingUp" size={18} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.dashboardBtnTitle}>View earnings & payouts</Text>
                                        <Text style={styles.dashboardBtnSub}>Opens Stripe dashboard</Text>
                                    </View>
                                    {isOpeningDashboard
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Icon name="ExternalLink" size={16} color="rgba(255,255,255,0.6)" />}
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Stats grid */}
                            <Animated.View
                                entering={FadeInUp.duration(300).delay(120)}
                                style={{ flexDirection: "row", gap: 10, marginTop: 12 }}
                            >
                                <View style={[styles.statCard, { flex: 1 }]}>
                                    <Text style={styles.statLabel}>This month</Text>
                                    <Text style={styles.statValue}>$0.00</Text>
                                    <Text style={styles.statMeta}>0 runs</Text>
                                </View>
                                <View style={[styles.statCard, { flex: 1 }]}>
                                    <Text style={styles.statLabel}>All time</Text>
                                    <Text style={styles.statValue}>$0.00</Text>
                                    <Text style={styles.statMeta}>0 payouts</Text>
                                </View>
                            </Animated.View>
                        </>
                    )}

                    {/* Section divider */}
                    <Animated.View
                        entering={FadeInUp.duration(300).delay(160)}
                        style={styles.sectionDivider}
                    >
                        <Text style={styles.sectionDividerEmoji}>💸</Text>
                    </Animated.View>

                    {/* How it works */}
                    <Animated.View entering={FadeInUp.duration(300).delay(180)}>
                        <Text style={styles.eyebrow}>
                            How it works{" "}
                            <Text style={{ color: BR.ink3, textTransform: "none", letterSpacing: 0 }}>· three steps</Text>
                        </Text>

                        <View style={{ gap: 10, marginTop: 12 }}>
                            {HOW_IT_WORKS.map((step, i) => (
                                <View key={step.title} style={styles.howItWorksCard}>
                                    <View style={{ position: "relative", flexShrink: 0 }}>
                                        <View style={[styles.howItWorksIcon, { backgroundColor: step.color, shadowColor: step.color }]}>
                                            <Icon name={step.icon} size={20} color="#fff" />
                                        </View>
                                        <View style={styles.howItWorksIndex}>
                                            <Text style={styles.howItWorksIndexText}>{i + 1}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, paddingTop: 2 }}>
                                        <Text style={styles.howItWorksTitle}>{step.title}</Text>
                                        <Text style={styles.howItWorksSub}>{step.sub}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* Footer note */}
                    <Animated.View entering={FadeInUp.duration(300).delay(220)} style={styles.footerNote}>
                        <Icon name="ShieldCheck" size={14} color={BR.ink3} />
                        <Text style={styles.footerNoteText}>
                            Payments are processed by Stripe. BiteRunr never stores your card or bank details.
                        </Text>
                    </Animated.View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        borderWidth: 1,
        borderColor: BR.line,
        alignItems: "center",
        justifyContent: "center",
    },
    stripeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: BR.mintSoft,
    },
    stripeBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: BR.mintInk,
    },
    eyebrow: {
        fontSize: 11,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    pageTitle: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 36,
        color: BR.ink,
        marginTop: 6,
        lineHeight: 42,
    },
    pageTitleAccent: {
        color: BR.orange,
        fontStyle: "italic",
        fontFamily: BR_FONT.displayExtraBold,
    },
    introBody: {
        fontSize: 14,
        color: BR.ink2,
        marginTop: 10,
        lineHeight: 21,
    },
    // Setup card (no account + pending)
    setupCard: {
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        borderColor: BR.line,
        padding: 20,
    },
    setupCardTitle: {
        fontFamily: BR_FONT.display,
        fontSize: 18,
        fontWeight: "700",
        color: BR.ink,
    },
    setupCardSub: {
        fontSize: 13,
        color: BR.ink3,
        marginTop: 4,
        lineHeight: 19,
    },
    setupStepIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: BR.orangeTint,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    setupStepTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: BR.ink,
    },
    setupStepDesc: {
        fontSize: 12,
        color: BR.ink3,
        marginTop: 2,
        lineHeight: 17,
    },
    progressStep: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    progressStepIcon: {
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    progressStepText: {
        fontSize: 14,
        color: BR.ink,
        fontWeight: "500",
    },
    // Balance card
    balanceCard: {
        backgroundColor: BR.orangeTint,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255,106,31,0.18)",
        padding: 22,
        overflow: "hidden",
        position: "relative",
        minHeight: 220,
    },
    balanceWatermark: {
        position: "absolute",
        right: -10,
        bottom: -28,
        fontFamily: BR_FONT.displayExtraBold,
        fontStyle: "italic",
        fontSize: 180,
        lineHeight: 180,
        color: "rgba(255,106,31,0.10)",
        letterSpacing: -10,
        pointerEvents: "none",
    } as any,
    activeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "rgba(46,190,123,0.15)",
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: BR.mint,
    },
    activeBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: BR.mintInk,
    },
    balanceEyebrow: {
        fontSize: 11,
        fontFamily: BR_FONT.mono,
        letterSpacing: 0.8,
        color: BR.orangeDeep,
        textTransform: "uppercase",
    },
    balanceAmount: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 52,
        lineHeight: 60,
        color: BR.ink,
        marginTop: 4,
        letterSpacing: -1,
        // TextInput resets
        padding: 0,
        borderWidth: 0,
        backgroundColor: "transparent",
    },
    balanceCurrency: {
        fontSize: 11,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    emptyBalanceNote: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginTop: 16,
        padding: 12,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.7)",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "rgba(26,20,16,0.16)",
    },
    emptyBalanceText: {
        flex: 1,
        fontSize: 12,
        color: BR.ink2,
        lineHeight: 18,
    },
    pendingNote: {
        marginTop: 10,
        fontSize: 12,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
    },
    payoutNote: {
        marginTop: 6,
        fontSize: 12,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
    },
    // Buttons
    primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        borderRadius: BR_RADIUS.md,
        backgroundColor: BR.orange,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    ghostBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 15,
        borderRadius: BR_RADIUS.md,
        backgroundColor: BR.card,
        borderWidth: 1,
        borderColor: BR.line2,
    },
    ghostBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: BR.ink,
    },
    dashboardBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: BR_RADIUS.lg,
        backgroundColor: BR.ink,
    },
    dashboardBtnIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    dashboardBtnTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },
    dashboardBtnSub: {
        fontSize: 11,
        color: "rgba(255,255,255,0.55)",
        marginTop: 1,
        fontFamily: BR_FONT.mono,
    },
    // Stats grid
    statCard: {
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
        padding: 14,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    statValue: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 24,
        color: BR.ink,
        marginTop: 6,
    },
    statMeta: {
        fontSize: 11,
        color: BR.ink3,
        marginTop: 2,
        fontFamily: BR_FONT.mono,
    },
    // Section divider
    sectionDivider: {
        marginTop: 30,
        marginBottom: 22,
        marginHorizontal: -18,
        paddingTop: 22,
        borderTopWidth: 1,
        borderStyle: "dashed",
        borderColor: BR.line2,
        alignItems: "center",
    },
    sectionDividerEmoji: {
        position: "absolute",
        top: -14,
        fontSize: 22,
        backgroundColor: BR.paper,
        paddingHorizontal: 8,
    },
    // How it works
    howItWorksCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        padding: 14,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
    },
    howItWorksIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 4,
    },
    howItWorksIndex: {
        position: "absolute",
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 999,
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: BR.ink,
        alignItems: "center",
        justifyContent: "center",
    },
    howItWorksIndexText: {
        fontFamily: BR_FONT.monoBold,
        fontSize: 11,
        color: BR.ink,
    },
    howItWorksTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: BR.ink,
    },
    howItWorksSub: {
        fontSize: 12.5,
        color: BR.ink2,
        marginTop: 3,
        lineHeight: 18,
    },
    // Footer note
    footerNote: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginTop: 22,
        padding: 14,
        borderRadius: BR_RADIUS.md,
        backgroundColor: BR.paper2,
    },
    footerNoteText: {
        flex: 1,
        fontSize: 11,
        color: BR.ink3,
        lineHeight: 17,
    },
});
