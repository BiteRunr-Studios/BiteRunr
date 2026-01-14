import { AuthContext } from "@/lib/convex-auth-context";
import { Redirect, Stack } from "expo-router";
import { useContext } from "react";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function ProtectedLayout() {
  const authState = useContext(AuthContext);

  // Wait for auth to be ready and not in the middle of signing in
  if (!authState.isReady || authState.isLoading) {
    return null;
  }

  if (!authState.isLoggedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
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
    </Stack>
  );
}
