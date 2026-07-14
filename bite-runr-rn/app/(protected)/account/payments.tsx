import { useState, useEffect, useCallback, type ComponentType } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { openURL } from "expo-linking";

type AnimatedTextInputProps = TextInputProps & {
  text?: string;
};

const AnimatedTextInput = Animated.createAnimatedComponent(
  TextInput as ComponentType<AnimatedTextInputProps>,
);

// ── Types ────────────────────────────────────────────────────────

type PayoutBalanceData = {
  available: number;
  pending: number;
  instantAvailable: number;
  instantPayoutAmount: number;
  instantPayoutFee: number;
  standardPayoutAmount: number;
  standardPayoutFee: number;
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
  {
    icon: "UserCheck" as const,
    title: "Verify your identity",
    desc: "Stripe will ask for your name, date of birth, and address.",
  },
  {
    icon: "CreditCard" as const,
    title: "Add a debit card",
    desc: "Link a debit card for instant payouts — or a bank account.",
  },
  {
    icon: "ShieldCheck" as const,
    title: "Quick review",
    desc: "Stripe verifies your info — usually takes a few minutes.",
  },
  {
    icon: "Banknote" as const,
    title: "Start getting paid",
    desc: "Once approved, squad members can pay you by card.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: "ShoppingBag" as const,
    color: BR.orange,
    title: "You run the order",
    sub: "Pick up food for your squad as the runner.",
  },
  {
    icon: "CreditCard" as const,
    color: BR.lilac,
    title: "Squad pays you",
    sub: "Each member taps to pay their share by card.",
  },
  {
    icon: "Wallet" as const,
    color: BR.mint,
    title: "You get paid",
    sub: "Funds land in your bank account in 1–2 days.",
  },
];

// ── Main screen ──────────────────────────────────────────────────

export default function PaymentsScreen() {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);
  const [_isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [isRequestingStandardPayout, setIsRequestingStandardPayout] =
    useState(false);
  const [balanceData, setBalanceData] = useState<PayoutBalanceData | null>(
    null,
  );

  // Animated counter for the balance number
  const balanceSv = useSharedValue(0);
  const animatedBalanceProps = useAnimatedProps(() => ({
    text: `$${balanceSv.value.toFixed(2)}`,
  }));

  useEffect(() => {
    if (balanceData !== null) {
      balanceSv.value = 0;
      balanceSv.value = withTiming(balanceData.available / 100, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [balanceData?.available, balanceSv, balanceData]);

  const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
  const createConnectAccount = useAction(
    api.stripeConnect.createConnectAccount,
  );
  const checkOnboardingStatus = useAction(
    api.stripeConnect.checkOnboardingStatus,
  );
  const createDashboardLink = useAction(api.stripeConnect.createDashboardLink);
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
        setIsChecking(true);
        let status: OnboardingStatus | null = null;
        try {
          status = await checkOnboardingStatus({});
        } catch {
          /* webhook will update */
        }
        setIsChecking(false);
        if (status) showOnboardingStatusAlert(status);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to start payout setup",
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
        error instanceof Error ? error.message : "Failed to check status",
      );
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
    try {
      payoutBalance = await getPayoutBalance({});
    } catch {
      /* silently fail */
    }
    setIsLoadingBalance(false);
    if (!payoutBalance) return;
    const instantPayoutAmount = sanitizeCurrencyAmount(
      payoutBalance.instantPayoutAmount,
    );
    setBalanceData({
      available: sanitizeCurrencyAmount(payoutBalance.available),
      pending: sanitizeCurrencyAmount(payoutBalance.pending),
      instantAvailable: sanitizeCurrencyAmount(payoutBalance.instantAvailable),
      instantPayoutAmount,
      instantPayoutFee: sanitizeCurrencyAmount(payoutBalance.instantPayoutFee),
      standardPayoutAmount: sanitizeCurrencyAmount(
        payoutBalance.standardPayoutAmount,
      ),
      standardPayoutFee: sanitizeCurrencyAmount(
        payoutBalance.standardPayoutFee,
      ),
      hasInstantPayoutCard: payoutBalance.hasInstantPayoutCard === true,
      hasBankPayoutAccount: payoutBalance.hasBankPayoutAccount === true,
      instantPayoutsEnabled:
        payoutBalance.instantPayoutsEnabled === true && instantPayoutAmount > 0,
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
            const feeMsg =
              payoutResult.fee > 0
                ? ` (Fee: ${formatCurrency(payoutResult.fee)})`
                : "";
            Alert.alert(
              "Payout Sent!",
              `${formatCurrency(payoutResult.amount)} is on its way to your debit card.${feeMsg}`,
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
      balanceData.standardPayoutAmount <= 0 ||
      !balanceData.hasBankPayoutAccount
    )
      return;
    Alert.alert(
      "Payout to Bank",
      `Transfer to your bank account?\n\nBalance: ${formatCurrency(balanceData.available)}\nStripe fee: -${formatCurrency(balanceData.standardPayoutFee)}\nYou'll receive: ${formatCurrency(balanceData.standardPayoutAmount)}\n\nFunds typically arrive in 1-2 business days.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          onPress: async () => {
            setIsRequestingStandardPayout(true);
            let payoutResult: { amount: number; fee: number } | null = null;
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
            const feeMsg =
              payoutResult.fee > 0
                ? ` Stripe fee: ${formatCurrency(payoutResult.fee)}.`
                : "";
            Alert.alert(
              "Payout Initiated",
              `${formatCurrency(payoutResult.amount)} will arrive in your bank account in 1-2 business days.${feeMsg}`,
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
      if (result.url) await WebBrowser.openBrowserAsync(result.url);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to open dashboard",
      );
    }
    setIsOpeningDashboard(false);
  };

  const getStepStatus = (index: number) => {
    if (!connectedAccount) return "pending";
    if (index === 0) return isOnboarded ? "done" : "pending";
    if (index === 1)
      return connectedAccount.payoutsEnabled
        ? "done"
        : isOnboarded
          ? "active"
          : "pending";
    if (index === 2)
      return connectedAccount.chargesEnabled
        ? "done"
        : isOnboarded
          ? "active"
          : "pending";
    if (index === 3)
      return connectedAccount.chargesEnabled ? "done" : "pending";
    return "pending";
  };

  const showInstantPayout =
    !!balanceData?.instantPayoutsEnabled &&
    (balanceData?.instantPayoutAmount ?? 0) > 0;
  const showBankTransfer =
    !!balanceData?.hasBankPayoutAccount &&
    (balanceData?.standardPayoutAmount ?? 0) > 0;
  const availableBalance = balanceData?.available ?? 0;
  const isEmpty = availableBalance <= 0;

  // ── Render ────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
      {/* Header */}
      <View className="relative flex-row items-center justify-between px-[18px] pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <View
          pointerEvents="none"
          className="absolute inset-x-0 bottom-3 top-2 items-center justify-center"
        >
          <BrText
            className="text-[17px] leading-6"
            style={BR_FONT_STYLE.display}
          >
            Payments
          </BrText>
        </View>
        <Pressable
          onPress={() => openURL("https://stripe.com/payments")}
          className="ml-auto flex-row items-center gap-1.5 rounded-full border border-[rgba(27,107,67,0.16)] bg-[#DDF5E8] px-3 py-[7px]"
          accessibilityRole="link"
          accessibilityLabel="Stripe verified. What is Stripe?"
        >
          <Icon name="ShieldCheck" size={12} color={BR.mintInk} />
          <Text
            className="text-xs text-[#1B6B43]"
            style={BR_FONT_STYLE.display}
          >
            Stripe
          </Text>
          <Icon name="ExternalLink" size={12} color={BR.mintInk} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BR.orange} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[18px] pb-[60px]"
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <Animated.View entering={FadeInUp.duration(300)} className="mt-1">
            <BrText
              variant="eyebrow"
              className="tracking-[1.2px] text-[#8A7A6E]"
            >
              Get paid back
            </BrText>
            <Text
              className="mt-1.5 text-[36px] leading-[42px] text-[#1A1410]"
              style={BR_FONT_STYLE.displayExtraBold}
            >
              Accept card{" "}
              <Text
                className="italic text-[#FF6A1F]"
                style={BR_FONT_STYLE.displayExtraBold}
              >
                payments.
              </Text>
            </Text>
            <Text className="mt-2.5 text-sm leading-[21px] text-[#4A3C32]">
              When you're the runner, your squad pays their share through
              BiteRunr. We deposit it straight to your bank.
            </Text>
          </Animated.View>

          {/* ── No account: setup CTA ── */}
          {hasNoAccount && (
            <Animated.View
              entering={FadeInUp.duration(300).delay(60)}
              className="mt-6"
            >
              <View className="rounded-[22px] border border-[rgba(26,20,16,0.08)] bg-white p-5">
                <Text
                  className="text-lg text-[#1A1410]"
                  style={BR_FONT_STYLE.display}
                >
                  Set up in ~2 min
                </Text>
                <Text className="mt-1 text-[13px] leading-[19px] text-[#8A7A6E]">
                  Here's what to expect:
                </Text>

                <View className="mt-[18px] gap-4">
                  {ONBOARDING_STEPS.map((step) => (
                    <View
                      key={step.title}
                      className="flex-row items-start gap-3.5"
                    >
                      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E2]">
                        <Icon
                          name={step.icon}
                          size={16}
                          color={BR.orangeDeep}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-sm text-[#1A1410]"
                          style={BR_FONT_STYLE.display}
                        >
                          {step.title}
                        </Text>
                        <Text className="mt-0.5 text-xs leading-[17px] text-[#8A7A6E]">
                          {step.desc}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleSetupPayouts}
                  disabled={isSettingUp}
                  className={`mt-[22px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 ${isSettingUp ? "opacity-70" : ""}`}
                  activeOpacity={0.85}
                >
                  {isSettingUp ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Icon name="ArrowRight" size={18} color="#fff" />
                  )}
                  <Text
                    className="text-base text-white"
                    style={BR_FONT_STYLE.display}
                  >
                    {isSettingUp ? "Opening Stripe…" : "Get started"}
                  </Text>
                </TouchableOpacity>

                <View className="mt-3 flex-row items-center justify-center gap-1.5">
                  <Icon name="Lock" size={11} color={BR.ink3} />
                  <Text
                    className="text-[11px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    Secured by Stripe
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* ── Pending: progress stepper ── */}
          {connectedAccount && !isReady && (
            <Animated.View
              entering={FadeInUp.duration(300).delay(60)}
              className="mt-6"
            >
              <View className="rounded-[22px] border border-[rgba(26,20,16,0.08)] bg-white p-5">
                <View className="mb-1.5 flex-row items-center gap-2">
                  <Icon
                    name={isOnboarded ? "Clock" : "CircleAlert"}
                    size={18}
                    color={BR.yolk}
                  />
                  <Text
                    className={`text-lg ${isOnboarded ? "text-[#7A4A20]" : "text-[#1A1410]"}`}
                    style={BR_FONT_STYLE.display}
                  >
                    {isOnboarded ? "Verification in progress" : "Almost there"}
                  </Text>
                </View>
                <Text className="text-[13px] leading-[19px] text-[#8A7A6E]">
                  {isOnboarded
                    ? "Stripe is reviewing your details. This usually takes just a few minutes — check back shortly."
                    : "You're almost done! Finish the last few steps to start accepting card payments."}
                </Text>

                <View className="mt-[18px] gap-2.5">
                  {ONBOARDING_STEPS.map((step, i) => {
                    const status = getStepStatus(i);
                    const isDone = status === "done";
                    const isActive = status === "active";
                    return (
                      <View
                        key={step.title}
                        className={`flex-row items-center gap-3 ${isDone || isActive ? "opacity-100" : "opacity-40"}`}
                      >
                        <View
                          className={`h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            isDone
                              ? "bg-[#DDF5E8]"
                              : isActive
                                ? "bg-[#FFF1C4]"
                                : "bg-[#FCEFE0]"
                          }`}
                        >
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
                              isDone ? BR.mint : isActive ? BR.yolk : BR.ink3
                            }
                            strokeWidth={isDone ? 3 : 2}
                          />
                        </View>
                        <Text
                          className={`text-sm text-[#1A1410] ${isDone ? "text-[#8A7A6E] line-through" : ""}`}
                          style={BR_FONT_STYLE.display}
                        >
                          {step.title}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View className="mt-5 gap-2.5">
                  {!isOnboarded && (
                    <TouchableOpacity
                      onPress={handleSetupPayouts}
                      disabled={isSettingUp}
                      className={`flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 ${isSettingUp ? "opacity-70" : ""}`}
                      activeOpacity={0.85}
                    >
                      {isSettingUp ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Icon name="ArrowRight" size={18} color="#fff" />
                      )}
                      <Text
                        className="text-base text-white"
                        style={BR_FONT_STYLE.display}
                      >
                        {isSettingUp ? "Opening Stripe…" : "Continue setup"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleCheckStatus}
                    disabled={isChecking}
                    className={`flex-row items-center justify-center gap-2 rounded-2xl border border-[rgba(26,20,16,0.14)] bg-white py-[15px] ${isChecking ? "opacity-70" : ""}`}
                    activeOpacity={0.85}
                  >
                    {isChecking ? (
                      <ActivityIndicator color={BR.ink} size="small" />
                    ) : (
                      <Icon name="RefreshCw" size={16} color={BR.ink} />
                    )}
                    <Text
                      className="text-[15px] text-[#1A1410]"
                      style={BR_FONT_STYLE.display}
                    >
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
              <Animated.View
                entering={FadeInUp.duration(300).delay(60)}
                className="mt-6"
              >
                <View className="relative min-h-[220px] overflow-hidden rounded-[22px] border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2] p-[22px]">
                  <Text
                    aria-hidden
                    className="pointer-events-none absolute -bottom-7 -right-2.5 text-[180px] italic leading-[180px] tracking-[-10px] text-[rgba(255,106,31,0.10)]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    $
                  </Text>

                  <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[rgba(46,190,123,0.15)] px-2.5 py-[5px]">
                    <View className="h-1.5 w-1.5 rounded-full bg-[#2EBE7B]" />
                    <Text
                      className="text-[11px] uppercase tracking-[0.8px] text-[#1B6B43]"
                      style={BR_FONT_STYLE.display}
                    >
                      Card payments active
                    </Text>
                  </View>

                  <View className="mt-[18px]">
                    <Text
                      className="text-[11px] uppercase tracking-[0.8px] text-[#E8551A]"
                      style={BR_FONT_STYLE.mono}
                    >
                      Available balance
                    </Text>
                    <AnimatedTextInput
                      animatedProps={animatedBalanceProps}
                      editable={false}
                      className="mt-1 border-0 bg-transparent p-0 text-[52px] leading-[60px] tracking-[-1px] text-[#1A1410]"
                      style={BR_FONT_STYLE.displayExtraBold}
                    />
                    <Text
                      className="mt-1 text-[11px] tracking-[0.5px] text-[#8A7A6E]"
                      style={BR_FONT_STYLE.mono}
                    >
                      {balanceData?.currency?.toUpperCase() ?? "USD"} · synced
                      with Stripe
                    </Text>
                  </View>

                  {balanceData && !isEmpty && (
                    <>
                      {balanceData.pending > 0 && (
                        <Text
                          className="mt-2.5 text-xs text-[#8A7A6E]"
                          style={BR_FONT_STYLE.mono}
                        >
                          {formatCurrency(balanceData.pending)} pending
                        </Text>
                      )}
                      <Text
                        className="mt-1.5 text-xs text-[#8A7A6E]"
                        style={BR_FONT_STYLE.mono}
                      >
                        Next payout ·{" "}
                        <Text
                          className="text-[#1A1410]"
                          style={BR_FONT_STYLE.mono}
                        >
                          Manual transfer
                        </Text>
                      </Text>
                    </>
                  )}
                </View>
              </Animated.View>

              {/* Payout buttons */}
              {balanceData && !isEmpty && (
                <Animated.View
                  entering={FadeInUp.duration(300).delay(80)}
                  className="mt-3 gap-2.5"
                >
                  {showInstantPayout && (
                    <TouchableOpacity
                      onPress={handleInstantPayout}
                      disabled={isRequestingPayout}
                      className={`flex-row items-center justify-center gap-2 rounded-2xl bg-[#2EBE7B] py-4 ${isRequestingPayout ? "opacity-70" : ""}`}
                      activeOpacity={0.85}
                    >
                      {isRequestingPayout ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Icon name="Zap" size={18} color="#fff" />
                      )}
                      <Text
                        className="text-base text-white"
                        style={BR_FONT_STYLE.display}
                      >
                        Instant payout ·{" "}
                        {formatCurrency(balanceData.instantPayoutAmount)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showBankTransfer && (
                    <TouchableOpacity
                      onPress={handleStandardPayout}
                      disabled={isRequestingStandardPayout}
                      className={`flex-row items-center justify-center gap-2 rounded-2xl border border-[rgba(26,20,16,0.14)] bg-white py-[15px] ${isRequestingStandardPayout ? "opacity-70" : ""}`}
                      activeOpacity={0.85}
                    >
                      {isRequestingStandardPayout ? (
                        <ActivityIndicator color={BR.ink} size="small" />
                      ) : (
                        <Icon name="Building" size={16} color={BR.ink} />
                      )}
                      <Text
                        className="text-[15px] text-[#1A1410]"
                        style={BR_FONT_STYLE.display}
                      >
                        Bank transfer ·{" "}
                        {formatCurrency(balanceData.standardPayoutAmount)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}

              {/* Stripe dashboard button */}
              <Animated.View
                entering={FadeInUp.duration(300).delay(100)}
                className="mt-3"
              >
                <TouchableOpacity
                  onPress={handleOpenDashboard}
                  disabled={isOpeningDashboard}
                  className={`flex-row items-center gap-3 rounded-[22px] bg-[#1A1410] p-4 ${isOpeningDashboard ? "opacity-70" : ""}`}
                  activeOpacity={0.85}
                >
                  <View className="h-[38px] w-[38px] items-center justify-center rounded-xl bg-[rgba(255,255,255,0.1)]">
                    <Icon name="TrendingUp" size={18} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm text-white"
                      style={BR_FONT_STYLE.display}
                    >
                      View earnings & payouts
                    </Text>
                    <Text
                      className="mt-px text-[11px] text-[rgba(255,255,255,0.55)]"
                      style={BR_FONT_STYLE.mono}
                    >
                      Opens Stripe dashboard
                    </Text>
                  </View>
                  {isOpeningDashboard ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Icon
                      name="ExternalLink"
                      size={16}
                      color="rgba(255,255,255,0.6)"
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Stats grid */}
              <Animated.View
                entering={FadeInUp.duration(300).delay(120)}
                className="mt-3 flex-row gap-2.5"
              >
                <View className="flex-1 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5">
                  <BrText
                    variant="eyebrow"
                    className="text-[10px] tracking-[1.2px] text-[#8A7A6E]"
                  >
                    This month
                  </BrText>
                  <Text
                    className="mt-1.5 text-2xl text-[#1A1410]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    $0.00
                  </Text>
                  <Text
                    className="mt-0.5 text-[11px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    0 runs
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5">
                  <BrText
                    variant="eyebrow"
                    className="text-[10px] tracking-[1.2px] text-[#8A7A6E]"
                  >
                    All time
                  </BrText>
                  <Text
                    className="mt-1.5 text-2xl text-[#1A1410]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    $0.00
                  </Text>
                  <Text
                    className="mt-0.5 text-[11px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    0 payouts
                  </Text>
                </View>
              </Animated.View>
            </>
          )}

          {/* Section divider */}
          <Animated.View
            entering={FadeInUp.duration(300).delay(160)}
            className="-mx-[18px] mb-[22px] mt-[30px] items-center border-t border-dashed border-[rgba(26,20,16,0.14)] pt-[22px]"
          >
            <Text className="absolute -top-3.5 bg-[#FFF7EE] px-2 text-[22px]">
              💸
            </Text>
          </Animated.View>

          {/* How it works */}
          <Animated.View entering={FadeInUp.duration(300).delay(180)}>
            <BrText
              variant="eyebrow"
              className="tracking-[1.2px] text-[#8A7A6E]"
            >
              How it works{" "}
              <BrText
                variant="eyebrow"
                className="normal-case tracking-normal text-[#8A7A6E]"
              >
                · three steps
              </BrText>
            </BrText>

            <View className="mt-3 gap-2.5">
              {HOW_IT_WORKS.map((step, i) => (
                <View
                  key={step.title}
                  className="flex-row items-start gap-3.5 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5"
                >
                  <View className="relative shrink-0">
                    <View
                      className="h-11 w-11 items-center justify-center rounded-[14px]"
                      style={{
                        backgroundColor: step.color,
                        shadowColor: step.color,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.35,
                        shadowRadius: 10,
                        elevation: 4,
                      }}
                    >
                      <Icon name={step.icon} size={20} color="#fff" />
                    </View>
                    <View className="absolute -right-1.5 -top-1.5 h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-[#1A1410] bg-white">
                      <Text
                        className="text-[11px] text-[#1A1410]"
                        style={BR_FONT_STYLE.monoBold}
                      >
                        {i + 1}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 pt-0.5">
                    <Text
                      className="text-sm text-[#1A1410]"
                      style={BR_FONT_STYLE.display}
                    >
                      {step.title}
                    </Text>
                    <Text className="mt-[3px] text-[12.5px] leading-[18px] text-[#4A3C32]">
                      {step.sub}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Footer note */}
          <Animated.View
            entering={FadeInUp.duration(300).delay(220)}
            className="mt-[22px] flex-row items-start gap-2.5 rounded-2xl bg-[#FCEFE0] p-3.5"
          >
            <Icon name="ShieldCheck" size={14} color={BR.ink3} />
            <Text className="flex-1 text-[11px] leading-[17px] text-[#8A7A6E]">
              Payments are processed by Stripe. BiteRunr never stores your card
              or bank details.
            </Text>
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
