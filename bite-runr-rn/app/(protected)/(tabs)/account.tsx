import React, { useContext } from "react";
import {
    ScrollView,
    Text,
    View,
    Alert,
    Pressable,
    Image,
    FlatList,
    RefreshControl,
} from "react-native";
import { PageWithHeader } from "@/components/layout/page-with-header";
import { supabase } from "@/lib/supabase";
import { ListItem } from "@/components/profile/list-item";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
} from "react-native-reanimated";
import { UserProfileType } from "@/lib/types";
import { fetchCurrentUser } from "@/api/profile/profile";
import { AuthContext } from "@/lib/supabase-auth-context";

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

export default function AccountTab() {
    const queryClient = useQueryClient();
    const { signOut } = useContext(AuthContext);

    const {
        data: user,
        isLoading,
        isRefetching,
        error,
        refetch,
    } = useQuery<UserProfileType | null, Error>({
        queryKey: ["current-user"],
        queryFn: fetchCurrentUser,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    async function onSignOut() {
        try {
            await supabase.auth.stopAutoRefresh();
            await signOut();
            queryClient.removeQueries({ queryKey: ["current-user"] });
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
            title="Account"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 12 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={() => refetch()}
                    />
                }>
                {(isLoading || isRefetching) && (
                    <>
                        <ProfileSkeleton />
                    </>
                )}

                {!isLoading && error && (
                    <View className="p-3 mb-4 border rounded-lg bg-destructive/10 border-destructive/30">
                        <Text className="text-destructive">
                            {error.message}
                        </Text>
                        <Pressable
                            onPress={() => refetch()}
                            className="px-3 py-2 mt-2 border rounded-lg border-black/10 dark:border-white/20 active:opacity-80">
                            <Text className="text-foreground">Try again</Text>
                        </Pressable>
                    </View>
                )}

                {!isLoading && !error && user && (
                    <View className="items-center mb-3">
                        {user.profile?.avatar_url ? (
                            <Image
                                source={{ uri: user.profile.avatar_url }}
                                className="w-32 h-32 rounded-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="items-center justify-center w-24 h-24 rounded-full bg-muted">
                                <Text className="font-semibold text-muted-foreground">
                                    {(fullName || user.email || "U")
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <Text className="mt-3 text-lg font-semibold text-center text-foreground">
                            {fullName || "Unknown User"}
                        </Text>
                        <Text className="text-center text-muted-foreground">
                            {user.email}
                        </Text>
                    </View>
                )}

                {!isLoading && !error && !user && (
                    <View className="p-3 mb-4 rounded-lg bg-muted">
                        <Text className="text-foreground">
                            You're not signed in. Please sign in to see your
                            profile.
                        </Text>
                    </View>
                )}

                <View className="gap-y-3">
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.key}
                        ItemSeparatorComponent={() => (
                            <View className="h-[1px] bg-transparent" />
                        )}
                        renderItem={({ item }) => (
                            <ListItem
                                iconName={item.icon}
                                title={item.title}
                                subtitle={item.subtitle}
                                // onPress={() => router.push(item.href)}
                                testID={`listitem-${item.key}`}
                            />
                        )}
                        contentContainerStyle={{ gap: 12 }}
                        scrollEnabled={false}
                    />
                </View>

                <View className="mt-2">
                    <Pressable
                        onPress={onSignOut}
                        className="px-4 py-3 border rounded-lg border-destructive active:opacity-80">
                        <Text className="font-semibold text-center text-destructive">
                            Sign out
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </PageWithHeader>
    );
}

function ProfileSkeleton() {
    const sweep = useSharedValue(0);

    React.useEffect(() => {
        sweep.value = withRepeat(
            withTiming(1, {
                duration: 1400,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );
    }, [sweep]);

    const shimmerStyle = useAnimatedStyle(() => {
        const translatePercent = -40 + sweep.value * 80;
        return {
            transform: [{ translateX: translatePercent }],
            opacity: 0.18,
        };
    });

    const Block = ({
        width,
        height,
        rounded = "rounded-md",
        className = "",
    }: {
        width: number;
        height: number;
        rounded?: "rounded-md" | "rounded-lg" | "rounded-full";
        className?: string;
    }) => {
        return (
            <View
                className={`bg-muted ${rounded} overflow-hidden ${className}`}
                style={{ width, height }}>
                {/* Shimmer overlay band */}
                <Animated.View
                    style={[
                        shimmerStyle,
                        {
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            width: width * 0.35,
                            backgroundColor: "#ffffff",
                        },
                    ]}
                />
            </View>
        );
    };

    return (
        <View className="items-center mb-3">
            {/* Avatar circle */}
            <Block width={144} height={144} rounded="rounded-full" />

            {/* Name bar */}
            <Block
                width={176}
                height={24}
                rounded="rounded-md"
                className="mt-3"
            />

            {/* Email bar */}
            <Block
                width={128}
                height={20}
                rounded="rounded-md"
                className="mt-2"
            />
        </View>
    );
}
