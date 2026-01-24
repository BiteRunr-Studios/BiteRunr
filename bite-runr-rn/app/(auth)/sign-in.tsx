import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { OAuthButton } from "@/components/auth/oauth-button";
import {
    createFormHandlers,
    FormState,
    validateEmail,
    getAuthErrorMessage,
} from "@/lib/auth-helpers";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useAuth } from "@/lib/convex-auth-context";
import { authClient } from "@/lib/auth-client";
import { router } from "expo-router";
import { useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    Pressable,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SignInScreen() {
    const { colorScheme } = useColorScheme();
    const { refreshSession } = useAuth();
    const [form, setForm] = useState<FormState>({
        email: { label: "Email", value: "", error: null, touched: false },
        password: { label: "Password", value: "", error: null, touched: false },
    });

    const { onChange, onBlur } = createFormHandlers(form, setForm);
    const [loading, setLoading] = useState(false);
    const passwordRef = useRef<TextInput>(null);
    const syncUser = useMutation(api.users.syncUser);

    const handleEmailSignIn = useCallback(async () => {
        const email = form.email?.value?.trim()?.toLowerCase();
        const password = form.password?.value;

        // Validate fields
        let hasError = false;
        const newForm = { ...form };

        if (!email) {
            newForm.email = {
                ...newForm.email!,
                error: "Email is required",
                touched: true,
            };
            hasError = true;
        } else if (!validateEmail(email)) {
            newForm.email = {
                ...newForm.email!,
                error: "Invalid email address",
                touched: true,
            };
            hasError = true;
        }

        if (!password) {
            newForm.password = {
                ...newForm.password!,
                error: "Password is required",
                touched: true,
            };
            hasError = true;
        }

        if (hasError) {
            setForm(newForm);
            return;
        }

        setLoading(true);
        try {
            // Sign in with email and password
            const response = await authClient.signIn.email({
                email: email!,
                password: password!,
            });

            if (response.error) {
                throw new Error(response.error.message || "Sign in failed");
            }

            // Refresh session to ensure Convex has the latest auth token
            await refreshSession();

            // Sync user to app's users table
            await syncUser();

            // Navigate to protected area
            router.replace("/(protected)/(tabs)");
        } catch (error) {
            console.error("Email sign-in error:", error);
            const errorResult = getAuthErrorMessage(error, "signIn");
            if (errorResult.field === "email") {
                setForm((prev) => ({
                    ...prev,
                    email: {
                        ...prev.email!,
                        error: errorResult.message,
                        touched: true,
                    },
                }));
            } else if (errorResult.field === "password") {
                setForm((prev) => ({
                    ...prev,
                    password: {
                        ...prev.password!,
                        error: errorResult.message,
                        touched: true,
                    },
                }));
            } else {
                Alert.alert("Sign In Error", errorResult.message);
            }
        } finally {
            setLoading(false);
        }
    }, [form.email?.value, form.password?.value, syncUser, refreshSession]);

    return (
        <SafeAreaView className="justify-center flex-1 px-4 transition-all duration-200">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="justify-center flex-1">
                <View className="mt-10"></View>
                {/* Title */}
                <Text className="mb-2 text-3xl font-bold text-foreground">
                    Welcome back
                </Text>
                <Text className="text-lg text-muted-foreground">
                    Your favorites, ordered for the whole crew.
                </Text>

                <View className="mt-8" />

                {/* Email Field*/}
                <Input
                    value={form.email!.value}
                    placeholder="Email"
                    leftIcon="Mail"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    errorMessage={form.email!.error}
                    onChangeText={(v) => onChange("email", v)}
                    onBlur={() => onBlur("email")}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                />

                <View className="mt-2" />

                {/* Password Field */}
                <Input
                    ref={passwordRef}
                    value={form.password!.value}
                    placeholder="Password"
                    leftIcon="Lock"
                    secureTextEntry
                    returnKeyType="done"
                    errorMessage={form.password!.error}
                    onChangeText={(v) => onChange("password", v)}
                    onBlur={() => onBlur("password")}
                    onSubmitEditing={handleEmailSignIn}
                />

                <View className="mt-4" />

                {/* Submit Button */}
                <Button
                    variant="full"
                    label="Sign In"
                    loading={loading}
                    onPress={handleEmailSignIn}
                />

                <View className="mt-8" />

                <View className="flex-row items-center justify-between gap-3">
                    <View className="bg-muted h-[1px] flex-grow"></View>
                    <Text className="italic text-muted-foreground">OR</Text>
                    <View className="bg-muted h-[1px] flex-grow"></View>
                </View>

                <View className="mt-8" />

                {/* GitHub Auth Button */}
                <OAuthButton provider="github" disabled={loading} />

                <View className="mt-3" />

                {/* Google Auth Button */}
                <OAuthButton provider="google" disabled={loading} />

                <View className="flex-row items-center justify-center gap-2 mt-4">
                    <Text className="text-muted-foreground">No account?</Text>
                    <Pressable
                        className="flex-row items-center gap-1"
                        onPress={() => router.push("/(auth)/sign-up")}>
                        <Text className="font-semibold text-primary">
                            Sign up
                        </Text>
                        <Icon
                            name="ArrowRight"
                            size={15}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
