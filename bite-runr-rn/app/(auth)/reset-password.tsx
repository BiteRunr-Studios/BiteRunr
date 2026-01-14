import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
    createFormHandlers,
    FormState,
    validateField,
} from "@/lib/auth-helpers";
import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function ResetPasswordScreen() {
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

    async function resetPassword() {
        setLoading(true);

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

        // Note: Password reset with Convex Auth requires custom implementation
        Alert.alert(
            "Coming Soon",
            "Password reset functionality will be available soon."
        );

        setLoading(false);
        router.replace("/(auth)/sign-in");
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
