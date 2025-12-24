import React, { useContext, useEffect, useState } from "react";
import { Text, View, Alert } from "react-native";
import { PageWithHeader } from "@/components/layout/page-with-header";
import { supabase } from "@/lib/supabase";
import { ListItem } from "@/components/profile/list-item";
import { UserProfileType } from "@/lib/types";
import { findUserByEmail } from "@/api/profile/profile";
import { AuthContext } from "@/lib/supabase-auth-context";
import Avatar from "@/components/profile/avatar";
import { Button } from "@/components/common/button";

type Item = {
    key: string;
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof ListItem>["iconName"];
    href: string;
};

const items: Item[] = [
    {
        key: "personal",
        title: "Personal Information",
        subtitle: "View & edit account details",
        icon: "person",
        href: "/account/account-info",
    },
    {
        key: "friends",
        title: "Friends",
        subtitle: "View, make & manage friends",
        icon: "people",
        href: "/account/friends",
    },
    {
        key: "payments",
        title: "Payments",
        subtitle: "View & claim owed amounts",
        icon: "card",
        href: "/account/payments",
    },
    {
        key: "support",
        title: "Support",
        subtitle: "Report an issue with the app",
        icon: "headset",
        href: "/account/support",
    },
    {
        key: "about",
        title: "About",
        subtitle: "Release notes & about us",
        icon: "information-circle",
        href: "/account/about",
    },
];

export default function ProfileScreen() {
    const { session, signOut } = useContext(AuthContext);
    const [user, setUser] = useState<UserProfileType | null>(null);

    useEffect(() => {
        async function getCurrentUser() {
            const user = await findUserByEmail(session?.user.email!);
            if (user) setUser(user);
        }
        getCurrentUser();
    }, [session]);

    async function onSignOut() {
        try {
            await supabase.auth.stopAutoRefresh();
            await signOut();
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Something went wrong.");
        }
    }

    const fullName = user?.profile
        ? [user.profile.first_name, user.profile.last_name]
              .filter(Boolean)
              .join(" ")
        : null;

    return (
        <PageWithHeader
            title="You"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}
        >
            <View className="flex items-center justify-center gap-2">
                <Avatar size={160} />
                <Text className="text-2xl text-foreground font-semibold">
                    {fullName}
                </Text>
                <Text className="-mt-3 text-lg text-muted-foreground">
                    {user?.email}
                </Text>
            </View>

            <Button
                onPress={onSignOut}
                label="Logout"
                variant="outline"
                color="red"
            />
        </PageWithHeader>
    );
}
