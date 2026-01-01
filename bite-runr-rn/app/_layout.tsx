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

const LIGHT_THEME: Theme = { ...DefaultTheme, colors: NAV_THEME.light };
const DARK_THEME: Theme = { ...DarkTheme, colors: NAV_THEME.dark };

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
        <AuthProvider>
            <QueryClientProvider client={queryClient}>
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
            </QueryClientProvider>
        </AuthProvider>
    );
}
