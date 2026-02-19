// app/_layout.tsx
import React from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StripeProvider } from "@stripe/stripe-react-native";
import {
    ThemeProvider,
    DarkTheme,
    DefaultTheme,
    type Theme,
} from "@react-navigation/native";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { AuthProvider } from "@/lib/convex-auth-context";
import { authClient } from "@/lib/auth-client";
import "../global.css";

const LIGHT_THEME: Theme = { ...DefaultTheme, colors: NAV_THEME.light };
const DARK_THEME: Theme = { ...DarkTheme, colors: NAV_THEME.dark };

// Custom logger that filters out auth-related errors (they're handled in-app)
const convexLogger = {
    log: console.log,
    warn: console.warn,
    error: (message: string, ...args: unknown[]) => {
        // Filter out auth server errors - these are handled in the UI
        const msgStr = String(message).toLowerCase();
        const isAuthError =
            msgStr.includes("invalid password") ||
            msgStr.includes("invalid credentials");
        const isPossibleConfigError =
            msgStr.includes("invalid secret") || msgStr.includes("auth");

        if (isAuthError) {
            // User auth errors are handled in UI - suppress completely
            return;
        }
        if (isPossibleConfigError) {
            // Log in development to help debug config issues, suppress in production
            if (__DEV__) {
                console.debug("[Auth Debug]", message, ...args);
            }
            return;
        }
        console.error(message, ...args);
    },
    logVerbose: console.log,
};

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
    unsavedChangesWarning: false,
    logger: convexLogger,
});

export default function RootLayout() {
    const { colorScheme } = useColorScheme();

    React.useEffect(() => {
        if (Platform.OS === "web" && typeof document !== "undefined") {
            document.documentElement.classList.add("bg-background");
            // Toggle dark class based on color scheme
            if (colorScheme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    }, [colorScheme]);

    return (
        <StripeProvider
            publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
            merchantIdentifier="merchant.com.RunrStudios.BiteRunrRN"
        >
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
            <AuthProvider>
                <ThemeProvider
                    value={colorScheme == "dark" ? DARK_THEME : LIGHT_THEME}
                >
                    <SafeAreaProvider>
                        <StatusBar style="auto" />
                        <GestureHandlerRootView style={{ flex: 1 }}>
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen
                                    name="(protected)"
                                    options={{
                                        headerShown: false,
                                    }}
                                />
                                <Stack.Screen
                                    name="(auth)"
                                    options={{
                                        headerShown: false,
                                        animation: "slide_from_left",
                                        animationTypeForReplace: "pop",
                                    }}
                                />
                                <Stack.Screen
                                    name="join/[code]"
                                    options={{
                                        headerShown: false,
                                        presentation: "modal",
                                    }}
                                />
                            </Stack>
                        </GestureHandlerRootView>
                    </SafeAreaProvider>
                </ThemeProvider>
            </AuthProvider>
        </ConvexBetterAuthProvider>
        </StripeProvider>
    );
}
