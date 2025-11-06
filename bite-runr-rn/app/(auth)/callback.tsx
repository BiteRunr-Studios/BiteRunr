import React from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function OAuthCallback() {
    const params = useLocalSearchParams();

    React.useEffect(() => {
        async function finish() {
            try {
                const code = typeof params.code === "string" ? params.code : undefined;
                const next = typeof params.next === "string" ? params.next : "/(tabs)";

                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        Alert.alert("OAuth failed", error.message);
                        return;
                    }
                }
                router.replace(next);
            } catch (e: any) {
                Alert.alert("Error", e?.message ?? "Something went wrong.");
            }
        }
        finish();
    }, [params]);

    return (
        <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
            <Text className="mt-2 text-muted-foreground">Completing sign-in…</Text>
        </View>
    );
}
