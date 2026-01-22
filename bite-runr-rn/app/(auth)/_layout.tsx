import React from "react";
import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/convex-auth-context";

export default function AuthLayout() {
    const { isReady, isLoggedIn, isLoading, isSigningUp } = useAuth();

    // Redirect to protected area if already logged in (and auth is ready)
    // Don't redirect during sign-up flow or while still loading
    if (isReady && !isLoading && isLoggedIn && !isSigningUp) {
        return <Redirect href="/(protected)/(tabs)" />;
    }

    // Always render the Stack to preserve navigation state
    // Show loading overlay only during initial auth check
    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{ headerTitleAlign: "center", headerShown: false }}
            >
                <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
                <Stack.Screen
                    name="sign-up"
                    options={{
                        title: "Sign Up",
                    }}
                />
                <Stack.Screen
                    name="verify-otp"
                    options={{
                        title: "Verify Email",
                        presentation: "fullScreenModal",
                        animation: "slide_from_bottom",
                        headerShown: false,
                        gestureEnabled: true,
                    }}
                />
            </Stack>
            {(!isReady || isLoading) && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.3)",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
        </View>
    );
}
