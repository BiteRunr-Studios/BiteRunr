import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
    createFormHandlers,
    FormState,
    validateField,
} from "@/lib/auth-helpers";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

export default function ResetPasswordScreen() {
    const params = useLocalSearchParams();
    const [form, setForm] = useState<FormState>({
        password: {
            label: "Password",
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
    const [sessionHandled, setSessionHandled] = useState(false);

    useEffect(() => {
        // Prevent running setup again if we already handled the session
        if (sessionHandled) {
            return;
        }

        const setupRecoverySession = async () => {
            const fragment = params["#"] as string;

            const fragmentParams = new URLSearchParams(fragment);
            const accessToken = fragmentParams.get("access_token")!;
            const refreshToken = fragmentParams.get("refresh_token")!;

            setSessionHandled(true);

            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                Alert.alert(
                    "Invalid Reset Link",
                    "This password reset link is invalid or has expired. Please request a new one."
                );
                router.replace("/(auth)/sign-in");
                return;
            }

            setSessionHandled(true);
        };

        setupRecoverySession();
    }, [params, sessionHandled]);

    async function resetPassword() {
        setLoading(true);

        // Validate all fields
        setForm((prev) => {
            const next: FormState = { ...prev };
            (Object.keys(prev) as Array<keyof FormState>).forEach((k) => {
                const field = prev[k];
                if (field) {
                    // Add this check
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

        // updateUser operates on the currently authenticated user from the reset link
        // No need to provide email - just the new password
        const { error } = await supabase.auth.updateUser({
            password: form.password!.value,
        });

        if (error) {
            setForm((prev) => ({
                ...prev,
                confirmPassword: {
                    ...prev.confirmPassword!,
                    touched: true,
                    error: error.message,
                },
            }));
            setLoading(false);
            return;
        }

        // Password reset successful - sign out to clear the temporary session
        await supabase.auth.signOut();

        setLoading(false);

        // Navigate to sign-in and show success message
        router.replace("/(auth)/sign-in");

        // Show alert after a brief delay to ensure navigation completes
        Alert.alert(
            "Password Reset Successful",
            "Your password has been updated. You can now sign in with your new password."
        );
    }

    return (
        <SafeAreaView className="flex-1 px-4 justify-center">
            <View className="mt-10"></View>

            {/* Title */}
            <Text className="text-3xl font-bold text-foreground mb-2">
                Reset your password
            </Text>

            {/* Description */}
            <Text className="text-lg text-muted-foreground">
                Type in your new password and you should be good to go! This
                password should be different from the previous password.
            </Text>

            <View className="mt-8" />

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
                onPress={resetPassword}
            />
        </SafeAreaView>
    );
}
