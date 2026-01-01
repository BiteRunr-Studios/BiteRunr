import React, { useContext } from "react";
import { Text, FlatList, ScrollView } from "react-native";
import { ListItem } from "@/components/profile/list-item";
import { AuthContext } from "@/lib/supabase-auth-context";
import { router } from "expo-router";
import { IconName } from "@/components/common/icon";
import ProfileHeader from "@/components/profile/profile-header";

type Item = {
    key: string;
    title: string;
    subtitle: string;
    icon: IconName;
    href?: string;
};

const profileSettingsItems: Item[] = [
    {
        key: "friends",
        title: "Friends",
        subtitle: "View, make & manage friends",
        icon: "UsersRound",
        href: "profile/friends",
    },
    {
        key: "payments",
        title: "Payments",
        subtitle: "View & claim owed amounts",
        icon: "CreditCard",
        href: "profile/payments",
    },
    {
        key: "wallet",
        title: "Wallet",
        subtitle: "View & change payment method",
        icon: "Wallet",
        href: "profile/wallet",
    },
    {
        key: "settings",
        title: "Settings",
        subtitle: "Set & configure profile preferences",
        icon: "Settings",
        href: "profile/settings",
    },
];

const settingsItems: Item[] = [
    {
        key: "support",
        title: "Support",
        subtitle: "Report an issue with the app",
        icon: "Headset",
        href: "profile/support",
    },
    {
        key: "about",
        title: "About",
        subtitle: "Release notes & about us",
        icon: "Info",
        href: "profile/about",
    },
];

const sessionItems: Item[] = [
    {
        key: "logout",
        title: "Logout",
        subtitle: "Leave & come back later",
        icon: "LogOut",
    },
    {
        key: "delete",
        title: "Delete Profile",
        subtitle: "Permanently delete profile",
        icon: "Trash2",
        href: "profile/delete",
    },
];

export default function ProfileScreen() {
    const { userProfile, signOut } = useContext(AuthContext);

    return (
        <ScrollView className="px-4 pt-2">
            <ProfileHeader
                user={userProfile}
                onPress={() =>
                    router.push("/(protected)/profile/personal-information")
                }
            />

            <Text className="ml-1 text-foreground/50 my-3">
                Profile Settings
            </Text>
            <FlatList
                className="mb-3 bg-[#fdfdfd] dark:bg-[#020202] border border-primary/30 rounded-2xl"
                data={profileSettingsItems}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                    <ListItem
                        iconName={item.icon}
                        title={item.title}
                        subtitle={item.subtitle}
                        onPress={() => router.push(item.href)}
                        id={item.key}
                    />
                )}
                scrollEnabled={false}
            />

            <Text className="ml-1 text-foreground/50 my-3">Help & Support</Text>
            <FlatList
                className="mb-3 bg-[#fdfdfd] dark:bg-[#020202] border border-primary/30 rounded-2xl"
                data={settingsItems}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                    <ListItem
                        iconName={item.icon}
                        title={item.title}
                        subtitle={item.subtitle}
                        onPress={() => router.push(item.href)}
                        id={item.key}
                    />
                )}
                scrollEnabled={false}
            />

            <Text className="ml-1 text-foreground/50 my-3">Session</Text>
            <FlatList
                className="mb-6 bg-[#fdfdfd] dark:bg-[#020202] border border-primary/30 rounded-2xl"
                data={sessionItems}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                    <ListItem
                        iconName={item.icon}
                        title={item.title}
                        subtitle={item.subtitle}
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
