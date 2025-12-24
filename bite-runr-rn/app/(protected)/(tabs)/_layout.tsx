import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";
import Icon from "@/components/common/icon";
import Avatar from "@/components/profile/avatar";

export default function TabLayout() {
    const { colorScheme } = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: NAV_THEME[colorScheme].primary,
                tabBarInactiveTintColor: "hsl(0 0% 50%)",
                tabBarStyle: {
                    backgroundColor: NAV_THEME[colorScheme].background,
                    borderTopColor: NAV_THEME[colorScheme].border,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <Icon size={22} name="House" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="groups"
                options={{
                    title: "Groups",
                    tabBarIcon: ({ color }) => (
                        <Icon size={22} name="ShoppingBag" color={color} />
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
