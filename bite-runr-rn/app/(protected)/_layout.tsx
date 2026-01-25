import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/convex-auth-context";
import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function ProtectedLayout() {
  const { isReady, isLoading, isLoggedIn, refreshSession } = useAuth();
  const syncUser = useMutation(api.users.syncUser);
  const hasSynced = useRef(false);

  // Sync user when entering protected area (handles OAuth callback)
  useEffect(() => {
    async function syncOnEntry() {
      if (isReady && isLoggedIn && !hasSynced.current) {
        hasSynced.current = true;
        try {
          // Refresh session to ensure Convex has the latest auth token
          await refreshSession();
          // Sync user to app's users table (creates if doesn't exist)
          await syncUser();
        } catch (error) {
          console.error("Error syncing user on protected entry:", error);
          // Reset flag so we can retry
          hasSynced.current = false;
        }
      }
    }
    syncOnEntry();
  }, [isReady, isLoggedIn, refreshSession, syncUser]);

  // Only redirect to sign-in when auth is ready and user is definitely not logged in
  if (isReady && !isLoading && !isLoggedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Always render the Stack to preserve navigation state
  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="order"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      {(!isReady || isLoading) && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}
