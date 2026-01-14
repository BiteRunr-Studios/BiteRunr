import { OAuthButton } from "@/components/auth/oauth-button";
import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import {
    createFormHandlers,
    FormState,
    validateField,
} from "@/lib/auth-helpers";
import { NAV_THEME } from "@/lib/constants";
import { AuthContext } from "@/lib/convex-auth-context";
import { useColorScheme } from "@/lib/use-color-scheme";
import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
    const { signIn, isLoggedIn } = useContext(AuthContext);
    const { colorScheme } = useColorScheme();
    const [signUpAttempted, setSignUpAttempted] = useState(false);
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

    // Navigate to protected route once auth state confirms login after sign-up
    useEffect(() => {
        if (signUpAttempted && isLoggedIn) {
            router.replace("/(protected)/(tabs)");
        }
    }, [signUpAttempted, isLoggedIn]);

    async function onSignUpWithEmail() {
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

        try {
            await signIn("password", {
                email: form.email!.value.toLowerCase(),
                password: form.password!.value,
                firstName: form.firstName!.value,
                lastName: form.lastName!.value,
                flow: "signUp",
            });
            // Mark sign-up as attempted - useEffect will handle navigation once auth state updates
            setSignUpAttempted(true);
        } catch (error: any) {
            const errorMessage = error?.message ?? "Sign-up failed";

            setForm((prev) => ({
                ...prev,
                email: {
                    ...prev.email!,
                    touched: true,
                    error: errorMessage,
                },
            }));
            setLoading(false);
        }
        // Don't set loading to false on success - keep loading while waiting for auth state
    }

    return (
        <SafeAreaView className="flex-1 px-4 justify-center transition-all duration-200">
            <View className="mt-10"></View>
            {/* Title */}
            <Text className="text-3xl font-bold text-foreground mb-2">
                Sign Up
            </Text>
            <Text className="text-lg text-muted-foreground">
                Your favorites, ordered for the whole crew.
            </Text>

            <View className="mt-8" />

            <View className="flex-row items-top justify-center gap-2">
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
                    />
                </View>

                {/* Last Name Field */}
                <View className="flex-1">
                    <Input
                        value={form.lastName!.value}
                        placeholder="Last Name"
                        leftIcon="IdCard"
                        autoCapitalize="words"
                        returnKeyType="next"
                        errorMessage={form.lastName!.error}
                        onChangeText={(v) => onChange("lastName", v)}
                        onBlur={() => onBlur("lastName")}
                    />
                </View>
            </View>

            <View className="mt-2" />

            {/* Email Field*/}
            <Input
                value={form.email!.value}
                placeholder="Email"
                leftIcon="Mail"
                autoCapitalize="none"
                returnKeyType="next"
                errorMessage={form.email!.error}
                onChangeText={(v) => onChange("email", v)}
                onBlur={() => onBlur("email")}
            />

            <View className="mt-2" />

            {/* Password Field*/}
            <Input
                value={form.password!.value}
                placeholder="Password"
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

            <View className="mt-4" />

            {/* Submit Button */}
            <Button
                variant="full"
                label="Continue"
                loading={loading}
                onPress={onSignUpWithEmail}
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

            <View className="mt-4 flex-row items-center justify-center gap-2">
                <Text className="text-muted-foreground">
                    Already have an account?
                </Text>
                <Pressable
                    className="flex-row items-center gap-1"
                    onPress={() => router.back()}
                >
                    <Icon
                        name="ArrowLeft"
                        size={15}
                        color={NAV_THEME[colorScheme].primary}
                    />
                    <Text className="text-primary font-semibold">Sign in</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
