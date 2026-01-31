import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/lib/use-color-scheme";
import { TabBarIcon } from "@/components/layout/tabbar-icon";
import { HeaderBar } from "@/components/layout/header-bar";
import { NAV_THEME } from "@/lib/constants";

export default function TabLayout() {
    const { isDarkColorScheme } = useColorScheme();

    return (
        <View className="flex-1 bg-background">
            <SafeAreaView edges={["top"]} className="bg-background">
                <HeaderBar />
            </SafeAreaView>
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
                    sceneStyle: {
                        backgroundColor: isDarkColorScheme
                            ? NAV_THEME.dark.background
                            : NAV_THEME.light.background,
                    },
                }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Home",
                        tabBarIcon: ({ color }) => (
                            <TabBarIcon name="House" color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="groups"
                    options={{
                        title: "Groups",
                        tabBarIcon: ({ color }) => (
                            <TabBarIcon name="Handbag" color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="account"
                    options={{
                        title: "Account",
                        tabBarIcon: ({ color }) => (
                            <TabBarIcon name="User" color={color} />
                        ),
                    }}
                />
            </Tabs>
        </View>
    );
}
