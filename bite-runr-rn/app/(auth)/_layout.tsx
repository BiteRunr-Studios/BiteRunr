import React, { useContext } from "react";
import { Redirect, Stack } from "expo-router";
import { AuthContext } from "@/lib/convex-auth-context";

export default function AuthLayout() {
    const { isReady, isLoggedIn, isLoading } = useContext(AuthContext);

    // Wait for auth to be ready
    if (!isReady || isLoading) {
        return null;
    }

    // Redirect to protected area if already logged in
    if (isLoggedIn) {
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
                    title: "Confirm Sign Up",
                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <Stack.Screen
                name="forgot-password"
                options={{
                    title: "Forgot Password",
                }}
            />
            <Stack.Screen
                name="reset-password"
                options={{
                    title: "Reset Password",
                }}
            />
        </Stack>
    );
}
