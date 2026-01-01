import React from "react";
import { View, Image, Pressable } from "react-native";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { SafeAreaView } from "react-native-safe-area-context";

type HeaderProps = {
    onLogoPress?: () => void;
    onBellPress?: () => void;
    logoSource: any;
};

export function Header({ onLogoPress, onBellPress, logoSource }: HeaderProps) {
    const { colorScheme } = useColorScheme();

    return (
        <SafeAreaView
            edges={["top"]}
            className="bg-background px-4 flex-row items-center justify-between min-h-20"
        >
            <Pressable onPress={onLogoPress} className="flex-row items-center">
                <Image
                    source={logoSource}
                    style={{ width: 80, height: 80 }}
                    resizeMode="contain"
                />
            </Pressable>

            <Pressable
                onPress={onBellPress}
                className="px-2 rounded-lg active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Notifications"
            >
                <Icon color={NAV_THEME[colorScheme].primary} name="Bell" />
            </Pressable>
        </SafeAreaView>
    );
}
