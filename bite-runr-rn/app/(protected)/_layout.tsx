import { AuthContext } from "@/lib/supabase-auth-context";
import { Redirect, Stack } from "expo-router";
import { useContext } from "react";

export default function ProtectedLayout() {
    const authState = useContext(AuthContext);

    if (!authState.isReady) {
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
                name="profile"
                options={{
                    headerShown: false,
                }}
            />
        </Stack>
    );
}
