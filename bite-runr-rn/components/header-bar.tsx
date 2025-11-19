import React from "react";
import { View, Image, Pressable } from "react-native";
import { TabBarIcon } from "@/components/tabbar-icon";
import { router } from "expo-router";

export function HeaderBar() {
    return (
        <View className="bg-background">
            <View className="flex-row items-center justify-between px-4 py-2 min-h-20">
                <Pressable
                    onPress={() => router.navigate("/")}
                    className="flex-row items-center">
                    <Image
                        source={require("@/assets/images/app-logo.png")}
                        style={{ width: 80, height: 80 }}
                        resizeMode="contain"
                    />
                </Pressable>

                <Pressable
                    onPress={() => router.navigate("/notifications")}
                    className="px-3 py-2 rounded-lg active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Notifications">
                    <TabBarIcon
                        name="notifications"
                        color="hsl(215.4 16.3% 46.9%)"
                    />
                </Pressable>
            </View>
        </View>
    );
}
