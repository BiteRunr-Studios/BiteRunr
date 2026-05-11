import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/convex-auth-context";

export default function AuthLayout() {
  const { isReady, isLoggedIn, isLoading, isSigningUp } = useAuth();

  // Redirect to protected area if already logged in (and auth is ready)
  // Don't redirect during sign-up flow or while still loading
  if (isReady && !isLoading && isLoggedIn && !isSigningUp) {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  // Always render the Stack to preserve navigation state.
  // Initial auth loading is now covered by the root splash.
  return (
    <Stack screenOptions={{ headerTitleAlign: "center", headerShown: false, freezeOnBlur: true }}>
      <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
      <Stack.Screen
        name="email-sign-in"
        options={{
          title: "Sign In",
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          title: "Sign Up",
        }}
      />
      <Stack.Screen
        name="verify-otp"
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
