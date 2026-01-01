import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";
import Icon from "@/components/common/icon";
import Avatar from "@/components/profile/avatar";
import { Header } from "@/components/layout/header";
import { Alert } from "react-native";

export default function TabLayout() {
    const { colorScheme } = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                header: () => (
                    <Header
                        logoSource={require("@/assets/images/app-logo.png")}
                        onLogoPress={() => Alert.alert("Logo pressed")}
                        onBellPress={() => Alert.alert("Notifications")}
                    />
                ),
                tabBarActiveTintColor: NAV_THEME[colorScheme].primary,
                tabBarInactiveTintColor: NAV_THEME[colorScheme].mutedForeground,
                tabBarStyle: {
                    backgroundColor: NAV_THEME[colorScheme].background,
                    borderTopColor: NAV_THEME[colorScheme].muted,
                },
                animation: "fade",
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <Icon name="House" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="groups"
                options={{
                    title: "Groups",
                    tabBarIcon: ({ color }) => (
                        <Icon fontWeight={4} name="ShoppingBag" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "You",
                    tabBarIcon: ({ color }) => <Avatar color={color} />,
                }}
            />
        </Tabs>
    );
}
