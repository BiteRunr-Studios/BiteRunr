import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useAuth } from "@/lib/convex-auth-context";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-helpers";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    View,
    Text,
    Pressable,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
    const { colorScheme } = useColorScheme();
    const { setIsSigningUp, refreshSession } = useAuth();
    const params = useLocalSearchParams<{
        email: string;
        type: "sign-up"; // Only used for sign-up email verification now
    }>();

    const { email } = params;

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    const inputRefs = useRef<(TextInput | null)[]>([]);
    const syncUser = useMutation(api.users.syncUser);

    // Focus first input on mount
    useEffect(() => {
        setTimeout(() => {
            inputRefs.current[0]?.focus();
        }, 100);
    }, []);

    // Cooldown timer for resend
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(
                () => setResendCooldown((c) => c - 1),
                1000,
            );
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleOtpChange = useCallback((index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/[^0-9]/g, "").slice(-1);

        setOtp((prev) => {
            const newOtp = [...prev];
            newOtp[index] = digit;
            return newOtp;
        });
        setError(null);

        // Auto-advance to next input
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
        const otpCode = otp.join("");

        if (otpCode.length !== OTP_LENGTH) {
            setError("Please enter the complete verification code");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Verify email with OTP code
            const response = await authClient.emailOtp.verifyEmail({
                email: email!,
                otp: otpCode,
            });

            if (response.error) {
                throw new Error(
                    response.error.message || "Verification failed",
                );
            }

            // Refresh session to ensure Convex has the latest auth token
            await refreshSession();

            // Sync the user to the app's users table
            await syncUser();

            // Reset signing up state and navigate to protected area
            setIsSigningUp(false);
            router.replace("/(protected)/(tabs)");
        } catch (err) {
            console.error("Verification error:", err);
            const errorResult = getAuthErrorMessage(err, "verify");
            setError(errorResult.message);
        } finally {
            setLoading(false);
        }
    }, [otp, email, syncUser, setIsSigningUp, refreshSession]);

    const handleResend = useCallback(async () => {
        if (resendCooldown > 0 || resending) return;

        setResending(true);
        setError(null);

        try {
            // Resend email verification OTP
            const response = await authClient.emailOtp.sendVerificationOtp({
                email: email!,
                type: "email-verification",
            });

            if (response.error) {
                throw new Error(
                    response.error.message || "Failed to resend code",
                );
            }

            Alert.alert(
                "Code Sent",
                "A new verification code has been sent to your email.",
            );
            setResendCooldown(60); // 60 second cooldown
            setOtp(Array(OTP_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
        } catch (err) {
            console.error("Resend error:", err);
            Alert.alert(
                "Error",
                "Failed to resend verification code. Please try again.",
            );
        } finally {
            setResending(false);
        }
    }, [email, resendCooldown, resending]);

    // Auto-submit when all digits are entered
    useEffect(() => {
        const otpCode = otp.join("");
        if (otpCode.length === OTP_LENGTH && !loading) {
            handleVerify();
        }
    }, [otp, loading, handleVerify]);

    return (
        <SafeAreaView
            edges={["top"]}
            className="justify-center flex-1 px-4 transition-all duration-200">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="justify-center flex-1">
                {/* Back button */}
                <Pressable
                    onPress={() => router.back()}
                    className="absolute left-0 flex-row items-center p-2 top-4">
                    <Icon
                        name="ArrowLeft"
                        size={20}
                        color={NAV_THEME[colorScheme].text}
                    />
                    <Text className="ml-1 text-foreground">Back</Text>
                </Pressable>

                <View className="mt-10"></View>

                {/* Title */}
                <Text className="mb-2 text-3xl font-bold text-foreground">
                    Check your email
                </Text>
                <Text className="text-lg text-muted-foreground">
                    We sent a verification code to
                </Text>
                <Text className="text-lg font-semibold text-foreground">
                    {email}
                </Text>

                <View className="mt-8" />

                {/* OTP Input */}
                <View className="flex-row justify-center gap-2">
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => {
                                inputRefs.current[index] = ref;
                            }}
                            value={digit}
                            onChangeText={(value) =>
                                handleOtpChange(index, value)
                            }
                            onKeyPress={({ nativeEvent }) =>
                                handleKeyPress(index, nativeEvent.key)
                            }
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 ${
                                error
                                    ? "border-destructive"
                                    : digit
                                      ? "border-primary"
                                      : "border-muted"
                            } bg-background text-foreground`}
                        />
                    ))}
                </View>

                {/* Error message */}
                {error && (
                    <Text className="mt-3 text-center text-destructive">
                        {error}
                    </Text>
                )}

                <View className="mt-6" />

                {/* Verify Button */}
                <Button
                    variant="full"
                    label="Verify"
                    loading={loading}
                    onPress={handleVerify}
                />

                <View className="mt-6" />

                {/* Resend link */}
                <View className="flex-row items-center justify-center">
                    <Text className="text-muted-foreground">
                        Didn't receive the code?{" "}
                    </Text>
                    <Pressable
                        onPress={handleResend}
                        disabled={resendCooldown > 0 || resending}>
                        <Text
                            className={`font-semibold ${
                                resendCooldown > 0
                                    ? "text-muted-foreground"
                                    : "text-primary"
                            }`}>
                            {resendCooldown > 0
                                ? `Resend in ${resendCooldown}s`
                                : resending
                                  ? "Sending..."
                                  : "Resend"}
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
