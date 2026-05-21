import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/convex-auth-context";
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { consumePendingAppleName } from "@/lib/apple-auth-helpers";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";
import { NotificationPermissionModal } from "@/components/notifications/notification-permission-modal";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function ProtectedLayout() {
  const { isReady, isLoading, isLoggedIn, refreshSession } = useAuth();
  const syncUser = useMutation(api.users.syncUser);
  const hasSynced = useRef(false);

  // Register for push notifications when entering protected area
  const {
    showPermissionModal,
    handleAllowNotifications,
    handleDenyNotifications,
  } = usePushNotifications();

  // Sync user when entering protected area (handles OAuth callback)
  useEffect(() => {
    async function syncOnEntry() {
      if (isReady && isLoggedIn && !hasSynced.current) {
        hasSynced.current = true;
        try {
          // Refresh session to ensure Convex has the latest auth token
          await refreshSession();
          const pendingAppleName = await consumePendingAppleName();
          // Sync user to app's users table (creates if doesn't exist)
          await syncUser({
            ...(pendingAppleName?.firstName && {
              firstName: pendingAppleName.firstName,
            }),
            ...(pendingAppleName?.lastName !== undefined && {
              lastName: pendingAppleName.lastName,
            }),
          });
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
      <Stack screenOptions={{ freezeOnBlur: true }}>
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
      <NotificationPermissionModal
        visible={showPermissionModal}
        onAllow={handleAllowNotifications}
        onDeny={handleDenyNotifications}
      />
    </View>
  );
}
