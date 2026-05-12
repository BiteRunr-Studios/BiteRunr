// app/_layout.tsx
import React from "react";
import { Platform, View, Text } from "react-native";
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
import Toast, { type BaseToastProps } from "react-native-toast-message";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts as useBricolage,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { AuthProvider, useAuth } from "@/lib/convex-auth-context";
import { authClient } from "@/lib/auth-client";
import Icon from "@/components/common/icon";
import AnimatedSplashScreen from "@/components/animated-splash-screen";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});

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

function useToastConfig() {
  const { colorScheme } = useColorScheme();
  const theme = NAV_THEME[colorScheme];

  return React.useMemo(
    () => ({
      success: (props: BaseToastProps) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginHorizontal: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colorScheme === "dark" ? 0.4 : 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "rgba(34,197,94,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="Check" size={16} color="#22c55e" />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 14,
              fontWeight: "600",
              flex: 1,
            }}
          >
            {props.text1}
          </Text>
        </View>
      ),
      error: (props: BaseToastProps) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginHorizontal: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colorScheme === "dark" ? 0.4 : 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "rgba(239,68,68,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="X" size={16} color="#ef4444" />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 14,
              fontWeight: "600",
              flex: 1,
            }}
          >
            {props.text1}
          </Text>
        </View>
      ),
    }),
    [colorScheme, theme],
  );
}

function RootAppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const toastConfig = useToastConfig();
  const { isReady, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const hasHiddenNativeSplash = React.useRef(false);

  const handleSplashFirstFrame = React.useCallback(() => {
    if (hasHiddenNativeSplash.current) {
      return;
    }

    hasHiddenNativeSplash.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleSplashHidden = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  const appReadyForReveal = isReady && !isLoading && fontsLoaded;

  return (
    <>
      <StatusBar style="dark" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
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
              animation: "fade",
              animationTypeForReplace: "pop",
            }}
          />
          <Stack.Screen
            name="join/[code]"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
        </Stack>
        {showSplash && (
          <AnimatedSplashScreen
            ready={appReadyForReveal}
            onFirstFrame={handleSplashFirstFrame}
            onHidden={handleSplashHidden}
          />
        )}
      </GestureHandlerRootView>
      <Toast config={toastConfig} topOffset={60} />
    </>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [fontsLoaded] = useBricolage({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

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
            value={colorScheme === "dark" ? DARK_THEME : LIGHT_THEME}
          >
            <SafeAreaProvider>
              <RootAppShell fontsLoaded={fontsLoaded} />
            </SafeAreaProvider>
          </ThemeProvider>
        </AuthProvider>
      </ConvexBetterAuthProvider>
    </StripeProvider>
  );
}
