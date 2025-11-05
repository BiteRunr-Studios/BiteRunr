import React from "react";
import { View, Image, Pressable } from "react-native";
import { TabBarIcon } from "@/components/tabbar-icon";

type HeaderBarProps = {
    onLogoPress?: () => void;
    onBellPress?: () => void;
    logoSource: any;
};

export function HeaderBar({ onLogoPress, onBellPress, logoSource }: HeaderBarProps) {
    return (
        <View className="bg-background border-b border-muted">
            <View className="px-4 py-4 min-h-20 flex-row items-center justify-between">
                <Pressable onPress={onLogoPress} className="flex-row items-center">
                    <Image
                        source={logoSource}
                        className="w-20 h-20"
                        resizeMode="contain"
                    />
                </Pressable>

                <Pressable
                    onPress={onBellPress}
                    className="px-3 py-2 rounded-lg active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                >
                    <TabBarIcon name="notifications" color="hsl(215.4 16.3% 46.9%)" />
                </Pressable>
            </View>
        </View>
    );
}

