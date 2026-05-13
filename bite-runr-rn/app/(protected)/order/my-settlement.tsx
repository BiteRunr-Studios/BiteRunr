import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";

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
      style={{
        height: TOOTH_H,
        backgroundColor: BR.paper,
        flexDirection: "row",
        overflow: "hidden",
      }}
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
    <View style={{ flexDirection: "row", gap: 8 }}>
      {STEPS.map((step, i) => {
        const isCurrent = i === currentStep;
        const isActive = i <= currentStep;
        return (
          <View
            key={step.label}
            style={[
              styles.stepCard,
              isCurrent && {
                backgroundColor: BR.orangeTint,
                borderColor: "rgba(255,106,31,0.3)",
              },
              !isActive && { opacity: 0.4 },
            ]}
          >
            <Icon
              name={step.icon}
              size={20}
              color={isCurrent ? BR.orangeDeep : BR.ink3}
            />
            <Text
              style={[
                styles.stepLabel,
                { color: isCurrent ? BR.orangeDeep : BR.ink2 },
              ]}
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BR.paper,
        }}
      >
        <ActivityIndicator size="large" color={BR.orange} />
      </View>
    );
  }

  if (settlement === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BR.paper,
        }}
      >
        <Text style={{ fontFamily: BR_FONT.mono, color: BR.coralInk }}>
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
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BR.paper }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Settle up</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: BR.paper }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <BrText variant="eyebrow" style={{ marginBottom: 10 }}>
          {settlement.orderName ?? "Your order"}
        </BrText>

        {/* Receipt */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <TornEdge position="top" />
          <View style={styles.receipt}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.receiptTitle}>BiteRunr</Text>
              <Text style={styles.receiptMeta}>
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

            <View style={styles.rule} />

            {amount > 0 ? (
              <>
                <Text style={styles.oweLabel}>You owe {creatorName}</Text>
                {showFeeBreakdown ? (
                  <>
                    <View style={styles.receiptRow}>
                      <Text style={styles.rowLabel}>Their share</Text>
                      <Text style={styles.rowValue}>{formatCents(amount)}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.rowLabel}>Service fee</Text>
                      <Text style={styles.rowValue}>
                        {formatCents(serviceFee)}
                      </Text>
                    </View>
                  </>
                ) : null}

                <View style={styles.rule} />

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text
                    style={[
                      styles.totalAmount,
                      { color: isSettled ? BR.mintInk : BR.orangeDeep },
                    ]}
                  >
                    {formatCents(showFeeBreakdown ? totalWithFee : amount)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.rule} />
                <View style={{ alignItems: "center", gap: 4 }}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={[styles.totalAmount, { color: BR.mintInk }]}>
                    {formatCents(0)}
                  </Text>
                  <Text style={[styles.receiptMeta, { marginTop: 4 }]}>
                    Nothing owed
                  </Text>
                </View>
              </>
            )}

            <View style={styles.rule} />
            <View style={{ alignItems: "center" }}>
              <Text style={styles.receiptCode}>
                BR-{orderId?.slice(-8).toUpperCase() ?? "--------"}
              </Text>
              <Text
                style={[styles.receiptCode, { marginTop: 5, letterSpacing: 5 }]}
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
          style={{ marginTop: 22 }}
        >
          <BrText variant="eyebrow" style={{ marginBottom: 10 }}>
            Payment status
          </BrText>
          <StatusStepper currentStep={currentStep} />
        </Animated.View>

        {/* Paying to */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(110)}
          style={[styles.runnerCard, { marginTop: 14 }]}
        >
          <BrAvatar name={creatorName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.runnerSubLabel}>Paying</Text>
            <Text style={styles.runnerName}>{creatorName}</Text>
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
            style={styles.settledBanner}
          >
            <Icon name="BadgeCheck" size={18} color={BR.mintInk} />
            <Text style={styles.settledBannerText}>
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
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {runnerAcceptsCards && (
            <TouchableOpacity
              onPress={handlePayWithCard}
              disabled={isPaying}
              style={[styles.primaryBtn, isPaying && { opacity: 0.6 }]}
            >
              {isPaying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="CreditCard" size={16} color="#fff" />
              )}
              <Text style={styles.primaryBtnText}>
                {isPaying
                  ? "Processing…"
                  : `Pay with card · ${formatCents(showFeeBreakdown ? totalWithFee : amount)}`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSettleInCash}
            style={[styles.ghostBtn, !runnerAcceptsCards && styles.primaryBtn]}
          >
            <Icon
              name="Banknote"
              size={16}
              color={runnerAcceptsCards ? BR.ink : "#fff"}
            />
            <Text
              style={[
                styles.ghostBtnText,
                !runnerAcceptsCards && styles.primaryBtnText,
              ]}
            >
              Settle in cash
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: BR.paper,
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
  headerTitle: {
    fontFamily: BR_FONT.display,
    fontSize: 17,
    fontWeight: "700",
    color: BR.ink,
  },
  receipt: {
    backgroundColor: BR.card,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  receiptTitle: {
    fontFamily: BR_FONT.displayExtraBold,
    fontStyle: "italic",
    fontSize: 22,
    color: BR.orangeDeep,
    textAlign: "center",
  },
  receiptMeta: {
    fontFamily: BR_FONT.mono,
    fontSize: 11,
    color: BR.ink3,
    letterSpacing: 1.2,
    marginTop: 3,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(26,20,16,0.1)",
    marginVertical: 14,
  },
  oweLabel: {
    fontFamily: BR_FONT.mono,
    fontSize: 13,
    color: BR.ink2,
    marginBottom: 10,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  rowLabel: {
    fontFamily: BR_FONT.mono,
    fontSize: 13,
    color: BR.ink2,
  },
  rowValue: {
    fontFamily: BR_FONT.mono,
    fontSize: 13,
    color: BR.ink,
  },
  totalLabel: {
    fontFamily: BR_FONT.displayExtraBold,
    fontSize: 18,
    color: BR.ink,
  },
  totalAmount: {
    fontFamily: BR_FONT.displayExtraBold,
    fontSize: 32,
  },
  receiptCode: {
    fontFamily: BR_FONT.mono,
    fontSize: 10,
    color: BR.ink3,
    letterSpacing: 1,
  },
  // step cards
  stepCard: {
    flex: 1,
    backgroundColor: BR.card,
    borderWidth: 1,
    borderColor: BR.line,
    borderRadius: BR_RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
    ...BR_SHADOW.card,
  },
  stepLabel: {
    fontFamily: BR_FONT.display,
    fontSize: 12,
    fontWeight: "600",
  },
  // runner card
  runnerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: BR_RADIUS.lg,
    backgroundColor: BR.orangeTint,
    borderWidth: 1,
    borderColor: "rgba(255,106,31,0.2)",
    ...BR_SHADOW.card,
  },
  runnerSubLabel: {
    fontFamily: BR_FONT.mono,
    fontSize: 11,
    color: BR.ink3,
    marginBottom: 2,
  },
  runnerName: {
    fontFamily: BR_FONT.display,
    fontSize: 15,
    fontWeight: "700",
    color: BR.ink,
  },
  // settled banner
  settledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    padding: 14,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.mintSoft,
    borderWidth: 1,
    borderColor: "rgba(46,190,123,0.25)",
  },
  settledBannerText: {
    flex: 1,
    fontFamily: BR_FONT.mono,
    fontSize: 13,
    color: BR.mintInk,
    fontWeight: "600",
  },
  // footer
  footer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 10,
    backgroundColor: BR.paper,
    borderTopWidth: 1,
    borderTopColor: BR.line,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orange,
    ...BR_SHADOW.primary,
  },
  primaryBtnText: {
    fontFamily: BR_FONT.display,
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line2,
    backgroundColor: BR.paper2,
  },
  ghostBtnText: {
    fontFamily: BR_FONT.display,
    fontSize: 15,
    fontWeight: "600",
    color: BR.ink,
  },
});
