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

export default function SignUpScreen() {
    const { colorScheme } = useColorScheme();
    const { setIsSigningUp } = useAuth();
    const [form, setForm] = useState<FormState>({
        firstName: {
            label: "First name",
            value: "",
            error: null,
            touched: false,
        },
        lastName: {
            label: "Last name",
            value: "",
            error: null,
            touched: false,
        },
        email: { label: "Email", value: "", error: null, touched: false },
        password: { label: "Password", value: "", error: null, touched: false },
    });

    const { onChange, onBlur } = createFormHandlers(form, setForm);
    const [loading, setLoading] = useState(false);

    const lastNameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const handleSignUp = useCallback(async () => {
        const firstName = form.firstName?.value?.trim();
        const lastName = form.lastName?.value?.trim();
        const email = form.email?.value?.trim();
        const password = form.password?.value;

        // Validate all fields
        let hasError = false;
        const newForm = { ...form };

        if (!firstName) {
            newForm.firstName = {
                ...newForm.firstName!,
                error: "First name is required",
                touched: true,
            };
            hasError = true;
        }

        if (!lastName) {
            newForm.lastName = {
                ...newForm.lastName!,
                error: "Last name is required",
                touched: true,
            };
            hasError = true;
        }

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
        } else if (password.length < 8) {
            newForm.password = {
                ...newForm.password!,
                error: "Password must be at least 8 characters",
                touched: true,
            };
            hasError = true;
        }

        if (hasError) {
            setForm(newForm);
            return;
        }

        setLoading(true);
        // Prevent auto-redirect while signing up
        setIsSigningUp(true);
        try {
            // Create account with email and password
            const response = await authClient.signUp.email({
                email: email!,
                password: password!,
                name: `${firstName} ${lastName}`.trim(),
            });

            if (response.error) {
                throw new Error(
                    response.error.message || "Failed to create account"
                );
            }

            // Send verification OTP to the email
            await authClient.emailOtp.sendVerificationOtp({
                email: email!,
                type: "email-verification",
            });

            // Navigate to OTP verification screen
            router.push({
                pathname: "/(auth)/verify-otp",
                params: {
                    email: email!,
                    type: "sign-up",
                },
            });
        } catch (error) {
            // Reset signing up state on error
            setIsSigningUp(false);
            console.error("Sign-up error:", error);
            const errorResult = getAuthErrorMessage(error, "signUp");
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
                Alert.alert("Sign Up Error", errorResult.message);
            }
        } finally {
            setLoading(false);
        }
    }, [form, setIsSigningUp]);

    return (
        <SafeAreaView className="justify-center flex-1 px-4 transition-all duration-200">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 justify-center"
            >
                <View className="mt-10"></View>
                {/* Title */}
                <Text className="mb-2 text-3xl font-bold text-foreground">
                    Sign Up
                </Text>
                <Text className="text-lg text-muted-foreground">
                    Your favorites, ordered for the whole crew.
                </Text>

                <View className="mt-8" />

                <View className="flex-row justify-center gap-2 items-top">
                    {/* First Name Field */}
                    <View className="flex-1">
                        <Input
                            value={form.firstName!.value}
                            placeholder="First Name"
                            leftIcon="IdCard"
                            autoCapitalize="words"
                            returnKeyType="next"
                            errorMessage={form.firstName!.error}
                            onChangeText={(v) => onChange("firstName", v)}
                            onBlur={() => onBlur("firstName")}
                            onSubmitEditing={() => lastNameRef.current?.focus()}
                        />
                    </View>

                    {/* Last Name Field */}
                    <View className="flex-1">
                        <Input
                            ref={lastNameRef}
                            value={form.lastName!.value}
                            placeholder="Last Name"
                            leftIcon="IdCard"
                            autoCapitalize="words"
                            returnKeyType="next"
                            errorMessage={form.lastName!.error}
                            onChangeText={(v) => onChange("lastName", v)}
                            onBlur={() => onBlur("lastName")}
                            onSubmitEditing={() => emailRef.current?.focus()}
                        />
                    </View>
                </View>

                <View className="mt-2" />

                {/* Email Field*/}
                <Input
                    ref={emailRef}
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
                    onSubmitEditing={handleSignUp}
                />

                <View className="mt-4" />

                {/* Submit Button */}
                <Button
                    variant="full"
                    label="Continue"
                    loading={loading}
                    onPress={handleSignUp}
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
                    <Text className="text-muted-foreground">
                        Already have an account?
                    </Text>
                    <Pressable
                        className="flex-row items-center gap-1"
                        onPress={() => router.back()}>
                        <Icon
                            name="ArrowLeft"
                            size={15}
                            color={NAV_THEME[colorScheme].primary}
                        />
                        <Text className="font-semibold text-primary">Sign in</Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
