import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import {
    createFormHandlers,
    FormState,
    validateField,
} from "@/lib/auth-helpers";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ForgotPasswordScreen() {
    const { colorScheme } = useColorScheme();
    const { email } = useLocalSearchParams<{
        email: string;
    }>();

    const [form, setForm] = useState<FormState>({
        email: { label: "Email", value: email ?? "", error: null, touched: false },
    });

    const { onChange, onBlur } = createFormHandlers(form, setForm);
    const [loading, setLoading] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Check if user exists
    const existingUser = useQuery(
        api.users.findByEmail,
        form.email?.value ? { email: form.email.value.toLowerCase() } : "skip"
    );

    useEffect(() => {
        if (cooldownSeconds > 0) {
            timerRef.current = setTimeout(() => {
                setCooldownSeconds(cooldownSeconds - 1);
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [cooldownSeconds]);

    async function sendResetPasswordLink() {
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

        if (!existingUser) {
            setForm((prev) => ({
                ...prev,
                email: {
                    ...prev.email!,
                    touched: true,
                    error: "An account does not exist for this email",
                },
            }));
            setLoading(false);
            return;
        }

        // Note: Password reset with Convex Auth requires custom implementation
        // For now, show a message that this feature is coming soon
        Alert.alert(
            "Coming Soon",
            "Password reset functionality will be available soon. Please contact support if you need assistance."
        );

        // Start 60-second cooldown
        setCooldownSeconds(60);
        setLoading(false);
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
                Forgot your password?
            </Text>

            {/* Description */}
            <Text className="text-lg text-muted-foreground">
                Don't worry, we will send a password reset link to your email
                address
            </Text>

            <View className="mt-8" />

            {/* Email Field*/}
            <Input
                value={form.email!.value}
                placeholder="Email"
                leftIcon="Mail"
                autoCapitalize="none"
                errorMessage={form.email!.error}
                returnKeyType="next"
                onChangeText={(v) => onChange("email", v)}
                onBlur={() => onBlur("email")}
            />

            <View className="flex-1" />

            <View className="mb-5" />

            {/* Submit Button */}
            <Button
                variant="full"
                icon="Send"
                label={
                    cooldownSeconds > 0
                        ? `Wait ${cooldownSeconds}s to resend`
                        : "Send reset link"
                }
                loading={loading}
                disabled={cooldownSeconds > 0}
                onPress={sendResetPasswordLink}
            />
        </SafeAreaView>
    );
}
