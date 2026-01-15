import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import {
    createFormHandlers,
    FormState,
    validateField,
    getAuthErrorMessage,
} from "@/lib/auth-helpers";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { AuthContext } from "@/lib/convex-auth-context";
import { useContext, useState, useEffect } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";

export default function ResetPasswordScreen() {
    const { colorScheme } = useColorScheme();
    const { resetPassword, pendingPasswordReset, sendPasswordResetCode } =
        useContext(AuthContext);
    const { email: emailParam } = useLocalSearchParams<{ email: string }>();

    // Use email from params or from pending password reset state
    const email = emailParam || pendingPasswordReset?.email;

    const [code, setCode] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const [form, setForm] = useState<FormState>({
        password: {
            label: "New Password",
            value: "",
            error: null,
            touched: false,
            show: false,
        },
        confirmPassword: {
            label: "Confirm Password",
            value: "",
            error: null,
            touched: false,
            show: false,
        },
    });

    const { onChange, onBlur } = createFormHandlers(form, setForm);
    const [loading, setLoading] = useState(false);

    // Cooldown timer for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(
                () => setResendCooldown(resendCooldown - 1),
                1000
            );
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // If no email, redirect back to forgot password
    if (!email) {
        return <Redirect href="/(auth)/forgot-password" />;
    }

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        setResending(true);
        setCodeError(null);

        try {
            await sendPasswordResetCode(email);
            setResendCooldown(60);
        } catch (err: unknown) {
            const { message } = getAuthErrorMessage(err, "forgotPassword");
            setCodeError(message);
        } finally {
            setResending(false);
        }
    };

    async function handleResetPassword() {
        // Validate code
        if (code.length !== 6) {
            setCodeError("Please enter a 6-digit code");
            return;
        }

        setLoading(true);
        setCodeError(null);

        // Validate all fields
        setForm((prev) => {
            const next: FormState = { ...prev };
            (Object.keys(prev) as Array<keyof FormState>).forEach((k) => {
                const field = prev[k];
                if (field) {
                    next[k] = {
                        ...field,
                        touched: true,
                        error: validateField(k, field.value, prev),
                    };
                }
            });
            return next;
        });

        // Check for validation errors
        const formHasErrors = (
            Object.keys(form) as Array<keyof FormState>
        ).some((k) => validateField(k, form[k]!.value, form) !== null);

        if (formHasErrors) {
            setLoading(false);
            return;
        }

        try {
            await resetPassword(code, form.password!.value);
            Alert.alert(
                "Password Reset",
                "Your password has been reset successfully. Please sign in with your new password.",
                [
                    {
                        text: "OK",
                        onPress: () => router.replace("/(auth)/sign-in"),
                    },
                ]
            );
        } catch (error: unknown) {
            const { message } = getAuthErrorMessage(error, "resetPassword");
            setCodeError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView className="flex-1 px-6 justify-center">
            {/* Back Button w/ Icon */}
            <Pressable
                onPress={() => router.back()}
                className="w-fit flex-row items-center gap-2 mt-8 mb-6"
            >
                <Icon
                    name="ArrowLeft"
                    size={20}
                    color={NAV_THEME[colorScheme].text}
                />
                <Text className="text-foreground text-lg">Back</Text>
            </Pressable>

            {/* Title */}
            <Text className="text-3xl font-bold text-foreground mb-2">
                Reset your password
            </Text>

            {/* Description */}
            <Text className="text-lg text-muted-foreground">
                We sent a 6-digit code to{" "}
                <Text className="font-semibold text-foreground">{email}</Text>.
                Enter the code and your new password below.
            </Text>

            <View className="mt-8" />

            {/* OTP Code Field */}
            <Input
                value={code}
                onChangeText={(text) => {
                    const digits = text.replace(/\D/g, "").slice(0, 6);
                    setCode(digits);
                    setCodeError(null);
                }}
                placeholder="Enter 6-digit code"
                leftIcon="KeyRound"
                keyboardType="number-pad"
                maxLength={6}
                errorMessage={codeError}
            />

            {/* Resend Code */}
            <View className="flex-row items-center mt-2 mb-4 gap-1">
                <Text className="text-muted-foreground">
                    Didn't receive the code?
                </Text>
                <Pressable
                    onPress={handleResend}
                    disabled={resending || resendCooldown > 0}
                >
                    <Text
                        className={`font-semibold ${
                            resendCooldown > 0
                                ? "text-muted-foreground"
                                : "text-primary"
                        }`}
                    >
                        {resending
                            ? "Sending..."
                            : resendCooldown > 0
                              ? `Resend in ${resendCooldown}s`
                              : "Resend"}
                    </Text>
                </Pressable>
            </View>

            <View className="mt-2" />

            {/* Password Field*/}
            <Input
                value={form.password!.value}
                placeholder={form.password!.label}
                leftIcon="Lock"
                rightIcon={form.password!.show ? "EyeClosed" : "Eye"}
                onRightIconPress={() => {
                    setForm((prev) => ({
                        ...prev,
                        password: {
                            ...prev.password!,
                            show: !prev.password!.show,
                        },
                    }));
                }}
                autoCapitalize="none"
                returnKeyType="default"
                errorMessage={form.password!.error}
                onChangeText={(v) => onChange("password", v)}
                onBlur={() => onBlur("password")}
                secureTextEntry={!form.password!.show}
            />

            <View className="mt-2" />

            <Input
                value={form.confirmPassword!.value}
                placeholder={form.confirmPassword!.label}
                leftIcon="Lock"
                rightIcon={form.confirmPassword!.show ? "EyeClosed" : "Eye"}
                onRightIconPress={() => {
                    setForm((prev) => ({
                        ...prev,
                        confirmPassword: {
                            ...prev.confirmPassword!,
                            show: !prev.confirmPassword!.show,
                        },
                    }));
                }}
                autoCapitalize="none"
                returnKeyType="default"
                errorMessage={form.confirmPassword!.error}
                onChangeText={(v) => onChange("confirmPassword", v)}
                onBlur={() => onBlur("confirmPassword")}
                secureTextEntry={!form.confirmPassword!.show}
            />

            <View className="flex-1" />

            <View className="mb-5" />

            {/* Submit Button */}
            <Button
                variant="full"
                icon="RefreshCcwDot"
                label={"Reset Password"}
                loading={loading}
                onPress={handleResetPassword}
            />
        </SafeAreaView>
    );
}
