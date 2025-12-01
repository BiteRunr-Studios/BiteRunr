import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "@/lib/use-color-scheme";
import { TabBarIcon } from "@/components/tabbar-icon";
import { NAV_THEME } from "@/lib/constants";

export default function TabLayout() {
    const { isDarkColorScheme } = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "hsl(32 100% 50%)",
                tabBarInactiveTintColor: "hsl(0 0% 50%)",
                tabBarStyle: {
                    backgroundColor: isDarkColorScheme
                        ? NAV_THEME.dark.background
                        : NAV_THEME.light.background,
                    borderTopColor: isDarkColorScheme
                        ? NAV_THEME.dark.border
                        : NAV_THEME.light.border,
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <TabBarIcon name="home" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="groups"
                options={{
                    title: "Groups",
                    tabBarIcon: ({ color }) => (
                        <TabBarIcon name="bag-sharp" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="account"
                options={{
                    title: "Account",
                    tabBarIcon: ({ color }) => (
                        <TabBarIcon name="person" color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
