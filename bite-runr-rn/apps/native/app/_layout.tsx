// app/_layout.tsx
import React, { useRef } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import {
    DarkTheme,
    DefaultTheme,
    type Theme,
    ThemeProvider,
} from "@react-navigation/native";
import "../global.css";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { setAndroidNavigationBar } from "@/lib/android-navigation-bar";

const LIGHT_THEME: Theme = {
    ...DefaultTheme,
    colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
    ...DarkTheme,
    colors: NAV_THEME.dark,
};

export const unstable_settings = {
    initialRouteName: "(tabs)",
};

const useIsomorphicLayoutEffect =
    Platform.OS === "web" && typeof window === "undefined"
        ? React.useEffect
        : React.useLayoutEffect;

export default function RootLayout() {
    const hasMounted = useRef(false);
    const { colorScheme, isDarkColorScheme } = useColorScheme();
    const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

    useIsomorphicLayoutEffect(() => {
        if (hasMounted.current) return;

        if (Platform.OS === "web" && typeof document !== "undefined") {
            document.documentElement.classList.add("bg-background");
        }

        setAndroidNavigationBar(colorScheme);
        setIsColorSchemeLoaded(true);
        hasMounted.current = true;
    }, [colorScheme]);

    if (!isColorSchemeLoaded) {
        return null;
    }

    return (
        <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
            <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
            </GestureHandlerRootView>
        </ThemeProvider>
    );
}
