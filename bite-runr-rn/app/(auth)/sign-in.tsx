// app/(auth)/sign-in.tsx
import React, { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { TabBarIcon } from "@/components/tabbar-icon";
import { createSessionFromUrl, redirectTo } from "@/app/(auth)/oauth";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
    // Email field
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);

    // Password field
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [touched, setTouched] = useState({ email: false, password: false }); // Field touched state

    const [loading, setLoading] = useState(false);
    const [loadingProvider, setLoadingProvider] =
        useState<OAuthProvider | null>(null);

    type OAuthProvider = "github" | "google";

    async function onSignInWithEmail() {
        try {
            if (!email || !password) {
                Alert.alert(
                    "Missing info",
                    "Please enter your email and password."
                );
                return;
            }
            setLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            console.log("signInWithPassword:", {
                error,
                hasSession: !!data?.session,
            });

            if (error) {
                Alert.alert("Sign in failed", error.message);
                return;
            }
            if (data?.session) {
                router.replace("/(tabs)");
            } else {
                Alert.alert("Sign-in incomplete", "No session returned.");
            }
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    async function onSignInWithOAuth(identityProvider: OAuthProvider) {
        try {
            setLoadingProvider(identityProvider);
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: identityProvider,
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                    scopes:
                        identityProvider == "github"
                            ? "read:user user:email"
                            : "",
                },
            });
            console.log("OAuth start:", { data, error });
            if (error) {
                Alert.alert(
                    `${identityProvider} sign-in failed`,
                    error.message
                );
                return;
            }

            const res = await WebBrowser.openAuthSessionAsync(
                data?.url ?? "",
                redirectTo
            );
            if (res.type === "success" && res.url) {
                await createSessionFromUrl(res.url);
                router.replace("/(tabs)");
            } else if (res.type === "cancel") {
                console.log("OAuth cancelled");
            }
            setLoadingProvider(identityProvider);
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Something went wrong.");
        } finally {
            setLoadingProvider(null);
        }
    }

    function validateRequiredField(value: String) {
        return value.trim().length > 0;
    }

    function validateEmail(email: string) {
        if (!validateRequiredField(email)) return false;

        const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;

        return emailRegex.test(email.trim());
    }

    return (
        <SafeAreaView className="flex-1" edges={["top"]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1"
            >
                <View className="px-4 py-6">
                    <Text className="text-3xl font-bold text-foreground mb-6">
                        Welcome back
                    </Text>

                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-2">
                            Email
                        </Text>
                        <View className="flex-row items-center rounded-lg border border-input bg-background px-3">
                            <TextInput
                                className="flex-1 py-3 text-foreground"
                                placeholder="email@address.com"
                                placeholderTextColor="hsl(215.4 16.3% 46.9%)"
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                    </View>

                    <View className="mb-6">
                        <Text className="text-sm font-medium text-foreground mb-2">
                            Password
                        </Text>
                        <View className="flex-row items-center rounded-lg border border-input bg-background px-3">
                            <TextInput
                                className="flex-1 py-3 text-foreground"
                                placeholder="Password"
                                placeholderTextColor="hsl(215.4 16.3% 46.9%)"
                                autoCapitalize="none"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>
                    </View>

                    <Pressable
                        onPress={onSignInWithEmail}
                        disabled={loading}
                        className={`rounded-lg px-4 py-3 ${
                            loading ? "bg-primary/50" : "bg-primary"
                        }`}
                    >
                        <View className="flex-row justify-center items-center">
                            {loading && (
                                <ActivityIndicator
                                    color="#fff"
                                    className="mr-2"
                                />
                            )}
                            <Text className="text-white font-semibold">
                                Sign in
                            </Text>
                        </View>
                    </Pressable>

                    <View className="mt-4" />

                    <Pressable
                        onPress={() => onSignInWithOAuth("github")}
                        disabled={loadingProvider === "github"}
                        className="flex-row items-center justify-center gap-2 rounded-lg px-4 py-3 border border-input bg-background active:opacity-80"
                    >
                        {loadingProvider === "github" && (
                            <ActivityIndicator className="mr-2" />
                        )}
                        <TabBarIcon color="" name="logo-github" />
                        <Text className="font-semibold">
                            Continue with GitHub
                        </Text>
                    </Pressable>

                    <View className="mt-2" />
                    <Pressable
                        onPress={() => onSignInWithOAuth("google")}
                        disabled={loadingProvider === "github"}
                        className="flex-row items-center justify-center gap-2 rounded-lg px-4 py-3 border border-input bg-background active:opacity-80"
                    >
                        {loadingProvider === "google" && (
                            <ActivityIndicator className="mr-2" />
                        )}
                        <TabBarIcon name="logo-google" color="" />
                        <Text className="text-foreground font-semibold">
                            Continue with Google
                        </Text>
                    </Pressable>

                    <View className="mt-4 flex-row justify-center">
                        <Text className="text-muted-foreground">
                            No account?
                        </Text>
                        <Link
                            href="/(auth)/sign-up"
                            className="text-primary font-semibold"
                        >
                            Sign up
                        </Link>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
