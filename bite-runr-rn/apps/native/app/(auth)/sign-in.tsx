// app/(auth)/sign-in.tsx
import React, { useState } from "react";
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Link, router } from "expo-router";

export default function SignInScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSignIn() {
        try {
            if (!email || !password) {
                Alert.alert("Missing info", "Please enter your email and password.");
                return;
            }
            setLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            console.log("signInWithPassword:", { error, session: data?.session });

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

    return (
        <SafeAreaView className="flex-1" edges={["top"]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
                <View className="px-4 py-6">
                    <Text className="text-3xl font-bold text-foreground mb-6">Welcome back</Text>
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
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
                        <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
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
                    <Pressable onPress={onSignIn} disabled={loading} className={`rounded-lg px-4 py-3 ${loading ? "bg-primary/50" : "bg-primary"}`}>
                        <View className="flex-row justify-center items-center">
                            {loading && <ActivityIndicator color="#fff" className="mr-2" />}
                            <Text className="text-white font-semibold">Sign in</Text>
                        </View>
                    </Pressable>
                    <View className="mt-4 flex-row justify-center">
                        <Text className="text-muted-foreground">No account? </Text>
                        <Link href="/(auth)/sign-up" className="text-primary font-semibold">
                            Sign up
                        </Link>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
