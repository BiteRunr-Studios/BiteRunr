import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useStripe } from "@stripe/stripe-react-native";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrText, BrChip, BrAvatar } from "@/components/br";
import { BR, BR_FONT_STYLE, BR_SHADOW } from "@/lib/br-theme";

// ── Stripe appearance ─────────────────────────────────────────────

const PAYMENT_SHEET_APPEARANCE = {
  shapes: { borderRadius: 12, borderWidth: 0.5 },
  primaryButton: { shapes: { borderRadius: 20 } },
  colors: {
    primary: "#FF6A1F",
    background: "#FFFFFF",
    componentBackground: "#F0F4F8",
    componentBorder: "#E0E0E0",
    componentDivider: "#E3E3E3",
    primaryText: "#020817",
    secondaryText: "#556170",
    componentText: "#020817",
    placeholderText: "#556170",
  },
};

// ── Utilities ─────────────────────────────────────────────────────

function formatCents(cents: number | bigint): string {
  const num = typeof cents === "bigint" ? Number(cents) : cents;
  return `$${(num / 100).toFixed(2)}`;
}

function getCurrentStep(
  settlementStatus: string,
  stripePayment: { status: string } | null,
): 0 | 1 | 2 {
  if (
    settlementStatus === "confirmed" ||
    settlementStatus === "settled_in_person"
  )
    return 2;
  if (stripePayment?.status === "pending") return 1;
  return 0;
}

// ── TornEdge ─────────────────────────────────────────────────────

const TOOTH_W = 9;
const TOOTH_H = 7;

function TornEdge({ position }: { position: "top" | "bottom" }) {
  const { width } = useWindowDimensions();
  const count = Math.ceil(width / TOOTH_W) + 2;
  const teeth = Array.from(
    { length: count },
    (_, index) => `${position}-tooth-${index}`,
  );
  return (
    <View
      className="flex-row overflow-hidden bg-[#FFF7EE]"
      style={{ height: TOOTH_H }}
    >
      {teeth.map((toothKey) => (
        <View
          key={toothKey}
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: TOOTH_W / 2,
            borderRightWidth: TOOTH_W / 2,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            ...(position === "top"
              ? { borderBottomWidth: TOOTH_H, borderBottomColor: BR.card }
              : { borderTopWidth: TOOTH_H, borderTopColor: BR.card }),
          }}
        />
      ))}
    </View>
  );
}

// ── StatusStep ────────────────────────────────────────────────────

const STEPS = [
  { label: "Unpaid", icon: "CircleDashed" as const },
  { label: "Sent", icon: "Send" as const },
  { label: "Confirmed", icon: "BadgeCheck" as const },
];

function StatusStepper({ currentStep }: { currentStep: 0 | 1 | 2 }) {
  return (
    <View className="flex-row gap-2">
      {STEPS.map((step, i) => {
        const isCurrent = i === currentStep;
        const isActive = i <= currentStep;
        return (
          <View
            key={step.label}
            className={`flex-1 items-center gap-1.5 rounded-2xl border px-2.5 py-3.5 ${
              isCurrent
                ? "border-[rgba(255,106,31,0.3)] bg-[#FFF1E2]"
                : "border-[rgba(26,20,16,0.08)] bg-white"
            } ${!isActive ? "opacity-40" : ""}`}
            style={BR_SHADOW.card}
          >
            <Icon
              name={step.icon}
              size={20}
              color={isCurrent ? BR.orangeDeep : BR.ink3}
            />
            <Text
              className={`text-xs ${isCurrent ? "text-[#E8551A]" : "text-[#4A3C32]"}`}
              style={BR_FONT_STYLE.displaySemibold}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export default function MySettlement() {
  const params = useLocalSearchParams();
  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  const insets = useSafeAreaInsets();
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
      const sheetParams = await createPaymentSheetParams({
        orderId: orderId as Id<"orders">,
      });
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: sheetParams.paymentIntentClientSecret,
        customerEphemeralKeySecret: sheetParams.ephemeralKeySecret,
        customerId: sheetParams.customerId,
        merchantDisplayName: "BiteRunr",
        returnURL: "biterunr://stripe-redirect",
        appearance: PAYMENT_SHEET_APPEARANCE,
        applePay: { merchantCountryCode: "CA" },
        googlePay: { merchantCountryCode: "CA", testEnv: __DEV__ },
      });
      if (initError) {
        Alert.alert("Error", initError.message);
        return;
      }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError && presentError.code !== "Canceled") {
        Alert.alert("Payment Failed", presentError.message);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create payment",
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
      <View className="flex-1 items-center justify-center bg-[#FFF7EE]">
        <ActivityIndicator size="large" color={BR.orange} />
      </View>
    );
  }

  if (settlement === null) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF7EE]">
        <Text className="text-[#B82340]" style={BR_FONT_STYLE.mono}>
          Not authorized to view settlement
        </Text>
      </View>
    );
  }

  const amount = Number(settlement.amountOwed);
  const serviceFee = settlement.serviceFee;
  const totalWithFee = settlement.totalWithFee;
  const currentStep = getCurrentStep(
    settlement.settlementStatus,
    settlement.stripePayment,
  );
  const isSettled =
    settlement.settlementStatus === "confirmed" ||
    settlement.settlementStatus === "settled_in_person";
  const canPay = amount > 0 && !isSettled;
  const runnerAcceptsCards = runnerStripeStatus?.acceptsCards ?? false;
  const showFeeBreakdown =
    runnerAcceptsCards &&
    !isSettled &&
    settlement.settlementStatus !== "settled_in_person";
  const creatorName = `${settlement.creatorFirstName} ${settlement.creatorLastName}`;

  return (
    <>
      <SafeAreaView edges={["top"]} className="bg-[#FFF7EE]" />

      {/* Header */}
      <View className="flex-row items-center justify-between bg-[#FFF7EE] px-[18px] pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <Text
          className="text-[17px] text-[#1A1410]"
          style={BR_FONT_STYLE.display}
        >
          Settle up
        </Text>
        <View className="w-[38px]" />
      </View>

      <ScrollView
        className="flex-1 bg-[#FFF7EE]"
        contentContainerClassName="px-[18px] pb-[140px]"
        showsVerticalScrollIndicator={false}
      >
        <BrText variant="eyebrow" className="mb-2.5">
          {settlement.orderName ?? "Your order"}
        </BrText>

        {/* Receipt */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <TornEdge position="top" />
          <View className="bg-white px-[22px] py-6">
            <View className="items-center">
              <Text
                className="text-center text-[22px] italic text-[#E8551A]"
                style={BR_FONT_STYLE.displayExtraBold}
              >
                BiteRunr
              </Text>
              <Text
                className="mt-[3px] text-center text-[11px] tracking-[1.2px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                ·{" "}
                {new Date()
                  .toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                  .toUpperCase()}{" "}
                ·
              </Text>
            </View>

            <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />

            {amount > 0 ? (
              <>
                <Text
                  className="mb-2.5 text-[13px] text-[#4A3C32]"
                  style={BR_FONT_STYLE.mono}
                >
                  You owe {creatorName}
                </Text>
                {showFeeBreakdown ? (
                  <>
                    <View className="mb-[5px] flex-row justify-between">
                      <Text
                        className="text-[13px] text-[#4A3C32]"
                        style={BR_FONT_STYLE.mono}
                      >
                        Their share
                      </Text>
                      <Text
                        className="text-[13px] text-[#1A1410]"
                        style={BR_FONT_STYLE.mono}
                      >
                        {formatCents(amount)}
                      </Text>
                    </View>
                    <View className="mb-[5px] flex-row justify-between">
                      <Text
                        className="text-[13px] text-[#4A3C32]"
                        style={BR_FONT_STYLE.mono}
                      >
                        Service fee
                      </Text>
                      <Text
                        className="text-[13px] text-[#1A1410]"
                        style={BR_FONT_STYLE.mono}
                      >
                        {formatCents(serviceFee)}
                      </Text>
                    </View>
                  </>
                ) : null}

                <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />

                <View className="flex-row items-baseline justify-between">
                  <Text
                    className="text-lg text-[#1A1410]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    TOTAL
                  </Text>
                  <Text
                    className={`text-[32px] ${isSettled ? "text-[#1B6B43]" : "text-[#E8551A]"}`}
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    {formatCents(showFeeBreakdown ? totalWithFee : amount)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />
                <View className="items-center gap-1">
                  <Text
                    className="text-lg text-[#1A1410]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    TOTAL
                  </Text>
                  <Text
                    className="text-[32px] text-[#1B6B43]"
                    style={BR_FONT_STYLE.displayExtraBold}
                  >
                    {formatCents(0)}
                  </Text>
                  <Text
                    className="mt-1 text-[11px] tracking-[1.2px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    Nothing owed
                  </Text>
                </View>
              </>
            )}

            <View className="my-3.5 h-px bg-[rgba(26,20,16,0.1)]" />
            <View className="items-center">
              <Text
                className="text-[10px] tracking-[1px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                BR-{orderId?.slice(-8).toUpperCase() ?? "--------"}
              </Text>
              <Text
                className="mt-[5px] text-[10px] tracking-[5px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                · · · · · · · ·
              </Text>
            </View>
          </View>
          <TornEdge position="bottom" />
        </Animated.View>

        {/* Payment status stepper */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(60)}
          className="mt-[22px]"
        >
          <BrText variant="eyebrow" className="mb-2.5">
            Payment status
          </BrText>
          <StatusStepper currentStep={currentStep} />
        </Animated.View>

        {/* Paying to */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(110)}
          className="mt-3.5 flex-row items-center gap-3 rounded-[22px] border border-[rgba(255,106,31,0.2)] bg-[#FFF1E2] p-3.5"
          style={BR_SHADOW.card}
        >
          <BrAvatar name={creatorName} size={44} />
          <View className="flex-1">
            <Text
              className="mb-0.5 text-[11px] text-[#8A7A6E]"
              style={BR_FONT_STYLE.mono}
            >
              Paying
            </Text>
            <Text
              className="text-[15px] text-[#1A1410]"
              style={BR_FONT_STYLE.display}
            >
              {creatorName}
            </Text>
          </View>
          <BrChip
            color="mint"
            leftSlot={<Icon name="ShieldCheck" size={12} color={BR.mintInk} />}
          >
            <Text>Verified</Text>
          </BrChip>
        </Animated.View>

        {isSettled && (
          <Animated.View
            entering={FadeInUp.duration(300).delay(160)}
            className="mt-3.5 flex-row items-center gap-2.5 rounded-2xl border border-[rgba(46,190,123,0.25)] bg-[#DDF5E8] p-3.5"
          >
            <Icon name="BadgeCheck" size={18} color={BR.mintInk} />
            <Text
              className="flex-1 text-[13px] text-[#1B6B43]"
              style={BR_FONT_STYLE.monoSemibold}
            >
              {settlement.settlementStatus === "settled_in_person"
                ? "Settled in person — no card needed"
                : "Payment confirmed · you're all square"}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer */}
      {canPay && (
        <View
          className="gap-2.5 border-t border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-[18px] pt-3.5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {runnerAcceptsCards && (
            <TouchableOpacity
              onPress={handlePayWithCard}
              disabled={isPaying}
              className={`h-[54px] flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] ${isPaying ? "opacity-60" : ""}`}
              style={BR_SHADOW.primary}
            >
              {isPaying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="CreditCard" size={16} color="#fff" />
              )}
              <Text
                className="text-base text-white"
                style={BR_FONT_STYLE.display}
              >
                {isPaying
                  ? "Processing…"
                  : `Pay with card · ${formatCents(showFeeBreakdown ? totalWithFee : amount)}`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSettleInCash}
            className={`h-[50px] flex-row items-center justify-center gap-2 rounded-2xl ${
              runnerAcceptsCards
                ? "border border-[rgba(26,20,16,0.14)] bg-[#FCEFE0]"
                : "h-[54px] bg-[#FF6A1F]"
            }`}
            style={runnerAcceptsCards ? undefined : BR_SHADOW.primary}
          >
            <Icon
              name="Banknote"
              size={16}
              color={runnerAcceptsCards ? BR.ink : "#fff"}
            />
            <Text
              className={
                runnerAcceptsCards
                  ? "text-[15px] text-[#1A1410]"
                  : "text-base text-white"
              }
              style={
                runnerAcceptsCards
                  ? BR_FONT_STYLE.displaySemibold
                  : BR_FONT_STYLE.display
              }
            >
              Settle in cash
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
