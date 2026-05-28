import Icon from "@/components/common/icon";
import { useAuth } from "@/lib/convex-auth-context";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BR } from "@/lib/br-theme";
import { BrText } from "@/components/br";

const OTP_LENGTH = 6;
const OTP_INPUT_KEYS = Array.from({ length: OTP_LENGTH }, (_, index) => {
  return `otp-${index}`;
});

export default function VerifyOtpScreen() {
  const { setIsSigningUp, refreshSession } = useAuth();
  const params = useLocalSearchParams<{ email: string; type: "sign-up" }>();
  const email = params.email?.toLowerCase();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRefs.current[0]?.focus(), 100);
    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setError(null);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handleVerify = useCallback(async () => {
    if (!email) {
      setError("Missing email address. Please start again.");
      return;
    }
    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      setError("Please enter the complete verification code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.emailOtp.verifyEmail({
        email,
        otp: otpCode,
      });
      if (response.error)
        throw new Error(response.error.message || "Verification failed");
      await refreshSession();
      setIsSigningUp(false);
    } catch (err) {
      console.error("Verification error:", err);
      setError(getAuthErrorMessage(err, "verify").message);
    } finally {
      setLoading(false);
    }
  }, [otp, email, setIsSigningUp, refreshSession]);

  const handleResend = useCallback(async () => {
    if (!email) {
      setError("Missing email address. Please start again.");
      return;
    }
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const response = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (response.error)
        throw new Error(response.error.message || "Failed to resend code");
      Alert.alert(
        "Code Sent",
        "A new verification code has been sent to your email.",
      );
      setResendCooldown(60);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      Alert.alert(
        "Error",
        "Failed to resend verification code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  }, [email, resendCooldown, resending]);

  const filledCount = otp.filter(Boolean).length;
  const verifyDisabled = loading || filledCount < OTP_LENGTH;
  const resendDisabled = resendCooldown > 0 || resending;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-[#FFF7EE]">
        <SafeAreaView className="flex-1 px-6" edges={["top"]}>
          <Pressable
            onPress={() => router.back()}
            className="mt-2 h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-center pb-10"
          >
            <View className="mb-5 h-16 w-16 items-center justify-center rounded-[20px] border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2]">
              <Icon name="Mail" size={28} color={BR.orangeDeep} />
            </View>

            <BrText
              weight="bold"
              className="mb-1.5 text-[28px] leading-[34px] text-[#1A1410]"
            >
              Check your email
            </BrText>
            <Text className="text-[15px] leading-[22px] text-[#8A7A6E]">
              We sent a 6-digit code to
            </Text>
            <Text className="mb-8 text-[15px] font-bold text-[#E8551A]">
              {email}
            </Text>

            <View className="mb-4 flex-row gap-2.5">
              {OTP_INPUT_KEYS.map((inputKey, index) => {
                const digit = otp[index] ?? "";
                return (
                  <TextInput
                    key={inputKey}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(index, v)}
                    onKeyPress={({ nativeEvent }) =>
                      handleKeyPress(index, nativeEvent.key)
                    }
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    className={`h-14 flex-1 rounded-2xl border-[1.5px] text-center text-[22px] font-bold ${
                      error
                        ? "border-[#FF4D6D] bg-[#FFE0E6] text-[#1A1410]"
                        : digit
                          ? "border-[#FF6A1F] bg-[#FFF1E2] text-[#E8551A]"
                          : "border-[rgba(26,20,16,0.08)] bg-white text-[#1A1410]"
                    }`}
                  />
                );
              })}
            </View>

            {error && (
              <View className="mb-4 flex-row items-center gap-1.5">
                <Icon name="CircleAlert" size={13} color={BR.coralInk} />
                <Text className="text-[13px] text-[#B82340]">{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleVerify}
              disabled={verifyDisabled}
              className={`mb-5 h-[54px] w-full items-center justify-center rounded-2xl bg-primary active:opacity-80 ${
                verifyDisabled ? "opacity-50" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="Verify email"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Verify email
                </Text>
              )}
            </Pressable>

            <View className="flex-row items-center justify-center">
              <Text className="text-sm text-[#8A7A6E]">
                Didn't get the code?{" "}
              </Text>
              <Pressable onPress={handleResend} disabled={resendDisabled}>
                <Text
                  className={`text-sm font-bold text-[#E8551A] ${
                    resendDisabled ? "opacity-45" : ""
                  }`}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : resending
                      ? "Sending…"
                      : "Resend"}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}
