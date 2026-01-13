import React, { useContext } from "react";
import { Text, FlatList, ScrollView, View } from "react-native";
import { ListItem } from "@/components/profile/list-item";
import { AuthContext } from "@/lib/supabase-auth-context";
import { router } from "expo-router";
import { IconName } from "@/components/common/icon";
import ProfileHeader from "@/components/profile/profile-header";

type Item = {
    key: string;
    title: string;
    icon: IconName;
    href?: string;
};

const profileSettingsItems: Item[] = [
    {
        key: "friends",
        title: "Friends",
        icon: "UsersRound",
        href: "profile/friends",
    },
    {
        key: "wallet-&-payments",
        title: "Wallet & Payments",
        icon: "CreditCard",
        href: "profile/wallet-and-payments",
    },
    {
        key: "login-&-security",
        title: "Passwords & Security",
        icon: "Shield",
        href: "profile/passwords-and-security",
    },
];

const settingsItems: Item[] = [
    {
        key: "support",
        title: "Support",
        icon: "Headset",
        href: "profile/support",
    },
    {
        key: "about",
        title: "About",
        icon: "Info",
        href: "profile/about",
    },
    {
        key: "logout",
        title: "Logout",
        icon: "DoorOpen",
    },
];

export default function ProfileScreen() {
    const { userProfile, signOut } = useContext(AuthContext);

    return (
        <ScrollView className="px-6 pt-2">
            <ProfileHeader
                user={userProfile}
                onPress={() => router.push("/(protected)/profile/edit")}
            />

            <FlatList
                data={profileSettingsItems}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                    <ListItem
                        iconName={item.icon}
                        title={item.title}
                        onPress={() => router.push(item.href)}
                        id={item.key}
                    />
                )}
                scrollEnabled={false}
            />

            <View className="my-3 border-b border-muted/50" />

            <FlatList
                data={settingsItems}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                    <ListItem
                        iconName={item.icon}
                        title={item.title}
                        onPress={() => {
                            if (item.key == "logout") {
                                signOut();
                                return;
                            }

                            router.push(item.href);
                        }}
                        id={item.key}
                    />
                )}
                scrollEnabled={false}
            />
        </ScrollView>
    );
}
