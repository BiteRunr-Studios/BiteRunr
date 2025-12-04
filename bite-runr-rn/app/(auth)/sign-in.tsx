import { OAuthButton } from "@/components/auth/oauth-button";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
    createFormHandlers,
    FormState,
    validateField,
} from "@/lib/auth-helpers";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
    const [form, setForm] = useState<FormState>({
        email: { label: "Email", value: "", error: null, touched: false },
        password: {
            label: "Password",
            value: "",
            error: null,
            touched: false,
            show: false,
        },
    });

    const { onChange, onBlur } = createFormHandlers(form, setForm);
    const [loading, setLoading] = useState(false);

    async function onSignInWithEmail() {
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

        const { data, error } = await supabase.auth.signInWithPassword({
            email: form.email.value,
            password: form.password.value,
        });

        if (error) {
            const errorMessage = error.message.toLowerCase();

            if (errorMessage.includes("email not confirmed")) {
                supabase.auth.resend({
                    type: "signup",
                    email: form.email.value,
                });
                router.push({
                    pathname: "/confirm-sign-up",
                    params: {
                        email: form.email.value.toLocaleLowerCase(),
                        password: form.password.value,
                    },
                });
            } else {
                setForm((prev) => ({
                    ...prev,
                    email: {
                        ...prev.email,
                        touched: true,
                        error: errorMessage,
                    },
                }));
            }

            setLoading(false);
            return;
        }

        if (data?.session) router.replace("/(tabs)");

        setLoading(false);
    }

    return (
        <SafeAreaView>
            <View className="px-4 py-6 transition-all duration-200">
                {/* Title */}
                <View className="items-center gap-2 mb-6">
                    <Image
                        className="mb-5"
                        source={require("@/assets/images/app-logo.png")}
                        style={{ width: 90, height: 45 }}
                        resizeMode="contain"
                    />
                    <Text className="text-3xl font-bold text-foreground">
                        Welcome back
                    </Text>
                    <Text className="text-lg text-muted-foreground">
                        Your favorites, ordered for the whole crew.
                    </Text>
                </View>

                {/* Email Field*/}
                <Input
                    value={form.email.value}
                    placeholder="Email"
                    leftIcon="Mail"
                    autoCapitalize="none"
                    returnKeyType="next"
                    errorMessage={form.email.error}
                    onChangeText={(v) => onChange("email", v)}
                    onBlur={() => onBlur("email")}
                />

                <View className="mt-2" />

                {/* Password Field*/}
                <Input
                    value={form.password.value}
                    placeholder="Password"
                    leftIcon="Lock"
                    rightIcon={form.password.show ? "EyeClosed" : "Eye"}
                    onRightIconPress={() => {
                        setForm((prev) => ({
                            ...prev,
                            password: {
                                ...prev.password,
                                show: !prev.password.show,
                            },
                        }));
                    }}
                    autoCapitalize="none"
                    returnKeyType="default"
                    errorMessage={form.password.error}
                    onChangeText={(v) => onChange("password", v)}
                    onBlur={() => onBlur("password")}
                    secureTextEntry={!form.password.show}
                />

                <View className="mt-4" />

                {/* Submit Button */}
                <Button
                    variant="full"
                    icon="CirclePlus"
                    label="Continue"
                    loading={loading}
                    onPress={onSignInWithEmail}
                />

                <View className="mt-8" />

                <View className="flex-row items-center justify-between gap-3">
                    <View className="bg-muted h-[1px] flex-grow"></View>
                    <Text className="text-muted-foreground italic">OR</Text>
                    <View className="bg-muted h-[1px] flex-grow"></View>
                </View>

                <View className="mt-8" />

                {/* GitHub Auth Button */}
                <OAuthButton provider="github" />

                <View className="mt-3" />

                {/* Google Auth Button */}
                <OAuthButton provider="google" />

                <View className="mt-4 flex-row justify-center gap-2">
                    <Text className="text-muted-foreground">No account?</Text>
                    <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                        <Text className="text-primary font-semibold">
                            Sign up
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
