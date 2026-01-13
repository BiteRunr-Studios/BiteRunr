import React from "react";
import { router, Stack } from "expo-router";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Pressable } from "react-native";
import Icon from "@/components/common/icon";

export default function ProfileLayout() {
    const { colorScheme } = useColorScheme();
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTransparent: false,
                headerBlurEffect: "none",
                headerLargeTitle: false,
                headerStyle: {
                    backgroundColor: NAV_THEME[colorScheme].background,
                },
                headerShadowVisible: false,
                headerTintColor: NAV_THEME[colorScheme].foreground,
                headerLeft: () => (
                    <Pressable
                        onPress={() => router.back()}
                        className="p-2 flex justify-center items-center"
                    >
                        <Icon
                            name="ArrowLeft"
                            size={20}
                            color={NAV_THEME[colorScheme].mutedForeground}
                        />
                    </Pressable>
                ),
            }}
        >
            <Stack.Screen
                name="edit"
                options={{
                    title: "Edit Profile",
                    headerTitleStyle: {
                        color: NAV_THEME[colorScheme].mutedForeground,
                    },
                }}
            />
        </Stack>
    );
}
