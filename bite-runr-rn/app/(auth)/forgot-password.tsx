import { findUserByEmail } from "@/api/profile/profile";
import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useColorScheme } from "@/lib/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ForgotPasswordFormData = {
    email: string;
};

export default function ForgotPasswordScreen() {
    const { colorScheme } = useColorScheme();

    const { email } = useLocalSearchParams<ForgotPasswordFormData>();
    const { control, handleSubmit, getValues, setError } =
        useForm<ForgotPasswordFormData>({
            defaultValues: {
                email: email,
            },
        });

    const [loading, setLoading] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const timerRef = useRef<number | null>(null);

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

    async function sendResetPasswordLink(data: ForgotPasswordFormData) {
        if (loading) return;

        setLoading(true);

        const existingUser = await findUserByEmail(data.email.toLowerCase());

        if (!existingUser) {
            setError("email", {
                type: "manual",
                message: "An account does not exist for this email",
            });
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(
            data.email.toLowerCase(),
            {
                redirectTo: "biterunr://(auth)reset-password",
            }
        );

        if (error) {
            setError("email", {
                type: "manual",
                message: error.message,
            });
            setLoading(false);
            return;
        }

        // Start 60-second cooldown
        setCooldownSeconds(60);
        setLoading(false);
    }

    return (
        <SafeAreaView className="flex-1 px-6 items-start">
            {/* Back Button w/ Icon */}
            <Pressable
                onPress={() => router.back()}
                className="w-fit flex-row items-center gap-2 mt-8 mb-6"
            >
                <Icon
                    name="ArrowLeft"
                    size={20}
                    color={NAV_THEME[colorScheme].foreground}
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
                name="email"
                control={control}
                placeholder="Email"
                leftIcon="Mail"
                autoCapitalize="none"
                returnKeyType="next"
                rules={{
                    required: "Email is required",
                    pattern: {
                        value: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/,
                        message: "Email is invalid",
                    },
                }}
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
                onPress={handleSubmit(sendResetPasswordLink)}
            />
        </SafeAreaView>
    );
}
