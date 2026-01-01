import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
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
