import { OAuthButton } from "@/components/auth/oauth-button";
import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/lib/supabase-auth-context";
import { useColorScheme } from "@/lib/use-color-scheme";
import { router } from "expo-router";
import { useContext, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";

type SigninFormData = {
    email: string;
    password: string;
};

export default function SignInScreen() {
    const { setPendingAuth } = useContext(AuthContext);
    const { colorScheme } = useColorScheme();
    const { control, handleSubmit, getValues, setError } =
        useForm<SigninFormData>({
            defaultValues: {
                email: "",
                password: "",
            },
        });
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    async function onSignInWithEmail(data: SigninFormData) {
        if (loading) return;

        setLoading(true);

        const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

        if (authError) {
            const errorMessage = authError.message.toLowerCase();

            if (errorMessage.includes("email not confirmed")) {
                supabase.auth.resend({
                    type: "signup",
                    email: data.email,
                });
                setPendingAuth({
                    email: data.email,
                    password: data.password,
                });
                router.push("/(auth)/confirm-sign-up");
            } else {
                setError("email", {
                    type: "manual",
                    message: errorMessage,
                });
            }

            setLoading(false);
            return;
        }

        if (authData?.session) router.replace("/(protected)/(tabs)");

        setLoading(false);
    }

    return (
        <SafeAreaView className="flex-1 px-6 justify-center transition-all duration-200">
            <View className="mt-10"></View>
            {/* Title */}
            <Text className="text-3xl font-bold text-foreground mb-2">
                Welcome back
            </Text>
            <Text className="text-lg text-muted-foreground">
                Your favorites, ordered for the whole crew.
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

            <View className="mt-2" />

            <Pressable
                className="mb-2 w-fit ml-auto"
                onPress={() =>
                    router.push({
                        pathname: "/forgot-password",
                        params: {
                            email: getValues("email"),
                        },
                    })
                }
            >
                <Text className="text-muted-foreground underline">
                    Forgot password?
                </Text>
            </Pressable>

            {/* Password Field*/}
            <Input
                name="password"
                control={control}
                placeholder="Password"
                leftIcon="Lock"
                rightIcon={showPassword ? "EyeClosed" : "Eye"}
                onRightIconPress={() => setShowPassword((prev) => !prev)}
                autoCapitalize="none"
                returnKeyType="default"
                secureTextEntry={!showPassword}
                rules={{ required: "Password is required" }}
            />

            <View className="mt-4" />

            {/* Submit Button */}
            <Button
                variant="full"
                label="Continue"
                loading={loading}
                onPress={handleSubmit(onSignInWithEmail)}
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
                <Text className="text-muted-foreground">No account?</Text>
                <Pressable
                    className="flex-row items-center gap-1"
                    onPress={() => router.push("/(auth)/sign-up")}
                >
                    <Text className="text-primary font-semibold">Sign up</Text>
                    <Icon
                        name="ArrowRight"
                        size={15}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
