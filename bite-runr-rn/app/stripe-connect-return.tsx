import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Icon from "@/components/common/icon";

export default function StripeConnectReturn() {
    const { status } = useLocalSearchParams<{ status?: string }>();
    const checkStatus = useAction(api.stripe.checkConnectAccountStatus);
    const [state, setState] = useState<"checking" | "success" | "refresh">(
        "checking",
    );

    useEffect(() => {
        if (status === "refresh") {
            setState("refresh");
            // Navigate back to payments after a delay
            const timer = setTimeout(() => {
                router.replace("/account/payments");
            }, 3000);
            return () => clearTimeout(timer);
        }

        // status === "complete"
        checkStatus()
            .then((result) => {
                setState(result.isOnboarded ? "success" : "refresh");
                // Navigate to payments page after showing result
                setTimeout(() => {
                    router.replace("/account/payments");
                }, 2000);
            })
            .catch(() => {
                setState("refresh");
                setTimeout(() => {
                    router.replace("/account/payments");
                }, 3000);
            });
    }, [status, checkStatus]);

    return (
        <SafeAreaView className="items-center justify-center flex-1 bg-background">
            {state === "checking" && (
                <View className="items-center px-8">
                    <ActivityIndicator size="large" className="mb-4" />
                    <Text className="text-lg font-semibold text-foreground">
                        Verifying Stripe setup...
                    </Text>
                </View>
            )}

            {state === "success" && (
                <View className="items-center px-8">
                    <View className="items-center justify-center w-20 h-20 mb-4 rounded-full bg-green-500/10">
                        <Icon name="CircleCheck" size={48} color="#22c55e" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">
                        Stripe Connected!
                    </Text>
                    <Text className="mt-2 text-center text-muted-foreground">
                        You can now receive payments when you run orders.
                    </Text>
                </View>
            )}

            {state === "refresh" && (
                <View className="items-center px-8">
                    <View className="items-center justify-center w-20 h-20 mb-4 rounded-full bg-orange-500/10">
                        <Icon name="RefreshCw" size={48} color="#f97316" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">
                        Setup Incomplete
                    </Text>
                    <Text className="mt-2 text-center text-muted-foreground">
                        Your Stripe onboarding wasn't completed. You can try
                        again from the Payments page.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}
