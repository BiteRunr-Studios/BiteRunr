import React from "react";
import { View, Image, Pressable } from "react-native";
import { TabBarIcon } from "@/components/layout/tabbar-icon";

type HeaderBarProps = {
    onLogoPress?: () => void;
    onBellPress?: () => void;
    logoSource: any;
};

export function HeaderBar({
    onLogoPress,
    onBellPress,
    logoSource,
}: HeaderBarProps) {
    return (
        <View className="bg-background">
            <View className="flex-row items-center justify-between px-4 py-2 min-h-20">
                <Pressable
                    onPress={onLogoPress}
                    className="flex-row items-center"
                >
                    <Image
                        source={logoSource}
                        style={{ width: 80, height: 80 }}
                        resizeMode="contain"
                    />
                </Pressable>

                <Pressable
                    onPress={onBellPress}
                    className="px-3 py-2 rounded-lg active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                >
                    <TabBarIcon
                        name="notifications"
                        color="hsl(215.4 16.3% 46.9%)"
                    />
                </Pressable>
            </View>
        </View>
    );
}
