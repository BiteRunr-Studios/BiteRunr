// app/_layout.tsx
import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { Stack, router } from "expo-router";
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
import { supabase } from "@/lib/supabase";
import { setAndroidNavigationBar } from "@/lib/android-navigation-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  const { isDarkColorScheme } = useColorScheme();
  const [ready, setReady] = React.useState(false);
  const [session, setSession] = React.useState<null | NonNullable<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
  >>(null);

  React.useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.classList.add("bg-background");
    }
    setAndroidNavigationBar(isDarkColorScheme ? "dark" : "light");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log("getSession on boot:", {
        error,
        session: data?.session,
      });
      if (!mounted) return;
      setSession(data?.session ?? null);
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("onAuthStateChange:", {
          event,
          session: newSession,
        });
        setSession(newSession ?? null);
      }
    );

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!ready) return;

    if (session) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/sign-in");
    }
  }, [ready, session]);

  if (!ready) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
        <SafeAreaProvider>
          <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              {session ? (
                <Stack.Screen name="(tabs)" />
              ) : (
                <Stack.Screen name="(auth)" />
              )}
            </Stack>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
