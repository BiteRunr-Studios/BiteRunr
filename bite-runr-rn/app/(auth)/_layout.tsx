import React, { useContext } from "react";
import { Redirect, Stack } from "expo-router";
import { AuthContext } from "@/lib/convex-auth-context";

export default function AuthLayout() {
    const { isReady, isLoggedIn, isLoading, isSigningUp } = useContext(AuthContext);

    // Wait for auth to be ready
    if (!isReady || isLoading) {
        return null;
    }

    // Redirect to protected area if already logged in
    // Don't redirect during sign-up flow (brief moment between account creation and sign out)
    if (isLoggedIn && !isSigningUp) {
        return <Redirect href="/(protected)/(tabs)" />;
    }

    return (
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
                name="confirm-sign-up"
                options={{
                    title: "Verify Email",
                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </Stack>
    );
}
