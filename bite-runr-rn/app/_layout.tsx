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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/supabase-auth-context";
import "../global.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 60_000,
        },
    },
});

export default function RootLayout() {
    const { colorScheme } = useColorScheme();
    const theme: Theme = {
        ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
        colors: {
            background: NAV_THEME[colorScheme].background,
            border: NAV_THEME[colorScheme].border,
            card: NAV_THEME[colorScheme].card,
            notification: NAV_THEME[colorScheme].destructive,
            primary: NAV_THEME[colorScheme].primary,
            text: NAV_THEME[colorScheme].foreground,
        },
    };

    return (
        <AuthProvider>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider value={theme}>
                    <SafeAreaProvider>
                        <StatusBar />
                        <GestureHandlerRootView>
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
            </QueryClientProvider>
        </AuthProvider>
    );
}
