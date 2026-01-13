import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";

type ConfirmPasswordFormData = {
    password: string;
    confirmPassword: string;
};

export default function ResetPasswordScreen() {
    const params = useLocalSearchParams();

    const [loading, setLoading] = useState(false);
    const [sessionHandled, setSessionHandled] = useState(false);
    const { control, handleSubmit, getValues, setError } =
        useForm<ConfirmPasswordFormData>({
            defaultValues: {
                password: "",
                confirmPassword: "",
            },
        });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        // Prevent running setup again if we already handled the session
        if (sessionHandled) return;

        const setupRecoverySession = async () => {
            const fragment = params["#"] as string;

            const fragmentParams = new URLSearchParams(fragment);
            const accessToken = fragmentParams.get("access_token")!;
            const refreshToken = fragmentParams.get("refresh_token")!;

            setSessionHandled(true);

            const { error } = await supabase.auth.setSession({
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

    async function resetPassword(data: ConfirmPasswordFormData) {
        if (loading) return;

        setLoading(true);

        // updateUser operates on the currently authenticated user from the reset link
        // No need to provide email - just the new password
        const { error } = await supabase.auth.updateUser({
            password: data.password,
        });

        if (error) {
            setError("confirmPassword", {
                type: "manual",
                message: error.message,
            });
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
        <SafeAreaView className="flex-1 px-6 justify-center">
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
                name="password"
                control={control}
                placeholder="New Password"
                leftIcon="Lock"
                rightIcon={showPassword ? "EyeClosed" : "Eye"}
                onRightIconPress={() => setShowPassword((prev) => !prev)}
                autoCapitalize="none"
                returnKeyType="default"
                secureTextEntry={!showPassword}
                rules={{
                    required: "New password is required",
                    pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message:
                            "Password must have uppercase, lowercase, and number",
                    },
                }}
            />

            <View className="mt-2" />

            <Input
                name="confirmPassword"
                control={control}
                placeholder="Confirm New Password"
                leftIcon="Lock"
                rightIcon={showConfirmPassword ? "EyeClosed" : "Eye"}
                onRightIconPress={() => setShowConfirmPassword((prev) => !prev)}
                autoCapitalize="none"
                returnKeyType="default"
                secureTextEntry={!showConfirmPassword}
                rules={{
                    required: "New confirmed password is required",
                    validate: (value) =>
                        value === getValues("password") ||
                        "Passwords do not match",
                }}
            />

            <View className="flex-1" />

            <View className="mb-5" />

            {/* Submit Button */}
            <Button
                variant="full"
                icon="RefreshCcwDot"
                label={"Reset Password"}
                loading={loading}
                onPress={handleSubmit(resetPassword)}
            />
        </SafeAreaView>
    );
}
