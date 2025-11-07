// app/(app)/under-construction.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function UnderConstructionScreen() {
    const { title, message, detail } = useLocalSearchParams<{
        title?: string;
        message?: string;
        detail?: string;
    }>();

    const pageTitle = title || "Page Under Construction";
    const mainMessage = message || "This page is not ready yet.";
    const detailMessage =
        detail ||
        "We’re building this feature. Check back soon or use the back button to continue.";

    return (
        <>
            <Stack.Screen options={{ title: pageTitle }} />
            <View className="flex-1 bg-background px-6 py-8 items-center justify-center">
                <View className="items-center">
                    <View className="w-24 h-24 rounded-full bg-muted items-center justify-center mb-4">
                        <Ionicons
                            name="construct-outline"
                            size={40}
                            color="#f97316"
                        />
                    </View>

                    <Text className="text-foreground text-2xl font-bold text-center">
                        {pageTitle}
                    </Text>
                    <Text className="text-muted-foreground text-base text-center mt-2">
                        {mainMessage}
                    </Text>
                    <Text className="text-muted-foreground text-center mt-1">
                        {detailMessage}
                    </Text>

                    <Pressable
                        onPress={() => router.back()}
                        className="mt-6 rounded-lg px-5 py-3 border border-black dark:border-muted-foreground active:opacity-80"
                    >
                        <Text className="text-foreground font-semibold">Go Back</Text>
                    </Pressable>
                </View>
            </View>
        </>
    );
}
