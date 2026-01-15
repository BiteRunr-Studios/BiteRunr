// app/_layout.tsx
import React from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
    ThemeProvider,
    DarkTheme,
    DefaultTheme,
    type Theme,
} from "@react-navigation/native";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { AuthProvider } from "@/lib/convex-auth-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
        if (
            msgStr.includes("auth") ||
            msgStr.includes("invalid secret") ||
            msgStr.includes("invalid password")
        ) {
            return; // Suppress auth errors (handled in UI)
        }
        console.error(message, ...args);
    },
    logVerbose: console.log,
};

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
    unsavedChangesWarning: false,
    logger: convexLogger,
});

// Custom storage adapter for React Native using AsyncStorage
const asyncStorageAdapter = {
    getItem: async (key: string) => {
        return await AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        await AsyncStorage.removeItem(key);
    },
};

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
        <ConvexProvider client={convex}>
            <ConvexAuthProvider client={convex} storage={asyncStorageAdapter}>
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
                                </Stack>
                            </GestureHandlerRootView>
                        </SafeAreaProvider>
                    </ThemeProvider>
                </AuthProvider>
            </ConvexAuthProvider>
        </ConvexProvider>
    );
}
