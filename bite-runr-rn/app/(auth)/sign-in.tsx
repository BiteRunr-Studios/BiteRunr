import { OAuthButton } from "@/components/auth/oauth-button";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
    // Email field
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);

    // Password field
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [hidePassword, setHidePassword] = useState(true);

    // Touched field state
    const [touched, setTouched] = useState({ email: false, password: false });

    // Loading login button state
    const [loading, setLoading] = useState(false);

    async function onSignInWithEmail() {
        setLoading(true);
        setTouched({ email: true, password: true });

        setPasswordError(null);
        setEmailError(null);

        handlePasswordChange(password);
        handleEmailChange(email);

        if (emailError || passwordError) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            const errorMessage = error.message.toLowerCase();

            if (errorMessage.includes("email not confirmed")) {
                supabase.auth.resend({
                    type: "signup",
                    email: email,
                });
                router.push("/confirm-sign-up");
            } else if (errorMessage.includes("missing email or phone")) {
                setEmailError("Email is required");
                setPasswordError("Password is required");
            } else {
                setPasswordError(errorMessage);
            }

            setLoading(false);
            return;
        }

        if (data?.session) router.replace("/(tabs)");

        setLoading(false);
    }

    function validateRequiredField(value: String) {
        return value.trim().length > 0;
    }

    function handlePasswordChange(value: string) {
        setPassword(value);

        if (!touched["password"]) return;

        if (!validateRequiredField(value)) {
            setPasswordError("Password is required");
        } else {
            setPasswordError(null);
        }
    }

    function handleEmailChange(value: string) {
        setEmail(value);

        if (!touched["email"]) return;

        if (!validateRequiredField(value)) {
            setEmailError("Email is required");
        } else if (!validateEmail(value)) {
            setEmailError("Email is invalid");
        } else {
            setEmailError(null);
        }
    }

    function validateEmail(email: string) {
        const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;

        return emailRegex.test(email.trim());
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
                    value={email}
                    placeholder="Email"
                    leftIcon="Mail"
                    autoCapitalize="none"
                    returnKeyType="next"
                    errorMessage={emailError}
                    onChangeText={(value) => {
                        setTouched({ ...touched, email: true });
                        handleEmailChange(value);
                    }}
                />

                <View className="mt-2" />

                {/* Password Field*/}
                <Input
                    value={password}
                    placeholder="Password"
                    leftIcon="Lock"
                    rightIcon={hidePassword ? "Eye" : "EyeClosed"}
                    onRightIconPress={() => {
                        setHidePassword(!hidePassword);
                    }}
                    autoCapitalize="none"
                    returnKeyType="default"
                    errorMessage={passwordError}
                    onChangeText={(value) => {
                        setTouched({ ...touched, password: true });
                        handlePasswordChange(value);
                    }}
                    secureTextEntry={hidePassword}
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
