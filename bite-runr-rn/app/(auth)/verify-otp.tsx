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
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView edges={["top"]} style={styles.root}>
        {/* Back button */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.body}
        >
          {/* Icon */}
          <View style={styles.iconTile}>
            <Icon name="Mail" size={28} color={BR.orangeDeep} />
          </View>

          {/* Heading */}
          <BrText weight="bold" style={styles.heading}>
            Check your email
          </BrText>
          <Text style={styles.subText}>We sent a 6-digit code to</Text>
          <Text style={styles.emailText}>{email}</Text>

          {/* OTP inputs */}
          <View style={styles.otpRow}>
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
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    error ? styles.otpBoxError : null,
                  ]}
                />
              );
            })}
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorRow}>
              <Icon name="CircleAlert" size={13} color={BR.coralInk} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Verify button */}
          <Pressable
            onPress={handleVerify}
            disabled={loading || filledCount < OTP_LENGTH}
            style={[
              styles.verifyBtn,
              (loading || filledCount < OTP_LENGTH) && styles.verifyBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify email</Text>
            )}
          </Pressable>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't get the code? </Text>
            <Pressable
              onPress={handleResend}
              disabled={resendCooldown > 0 || resending}
            >
              <Text
                style={[
                  styles.resendBtn,
                  (resendCooldown > 0 || resending) && { opacity: 0.45 },
                ]}
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
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BR.paper,
    paddingHorizontal: 24,
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
    marginTop: 8,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 40,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BR.orangeTint,
    borderWidth: 1,
    borderColor: "rgba(255,106,31,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    lineHeight: 34,
    color: BR.ink,
    marginBottom: 6,
  },
  subText: {
    fontSize: 15,
    color: BR.ink3,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 15,
    fontWeight: "700",
    color: BR.orangeDeep,
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1.5,
    borderColor: BR.line,
    backgroundColor: BR.card,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: BR.ink,
  },
  otpBoxFilled: {
    borderColor: BR.orange,
    backgroundColor: BR.orangeTint,
    color: BR.orangeDeep,
  },
  otpBoxError: {
    borderColor: BR.coral,
    backgroundColor: BR.coralSoft,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: BR.coralInk,
  },
  verifyBtn: {
    height: 54,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    ...BR_SHADOW.primary,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: BR_FONT.display,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  resendLabel: {
    fontSize: 14,
    color: BR.ink3,
  },
  resendBtn: {
    fontSize: 14,
    fontWeight: "700",
    color: BR.orangeDeep,
  },
});
