import React, { useContext, useState, useCallback } from "react";
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
import { ListItem } from "@/components/profile/list-item";
import { ErrorBoundary } from "@/components/common/error-boundary";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
} from "react-native-reanimated";
import { AuthContext } from "@/lib/convex-auth-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";

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
        icon: "User",
        href: "/account/account-info",
    },
    {
        key: "friends",
        title: "Friends",
        subtitle: "View, make & manage friends",
        icon: "Users",
        href: "/account/friends",
    },
    {
        key: "payments",
        title: "Payments",
        subtitle: "View & claim owed amounts",
        icon: "CreditCard",
        href: "/account/payments",
    },
    {
        key: "locations",
        title: "Locations",
        subtitle: "View & add locations",
        icon: "MapPinned",
        href: "/account/locations",
    },
    {
        key: "support",
        title: "Support",
        subtitle: "Report an issue with the app",
        icon: "Headset",
        href: "/account/support",
    },
    {
        key: "about",
        title: "About",
        subtitle: "Release notes & about us",
        icon: "Info",
        href: "/account/about",
    },
];

export default function AccountTab() {
    const { signOut } = useContext(AuthContext);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const user = useQuery(api.users.getCurrentUser);
    const isLoading = user === undefined;

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        // Convex queries are real-time, so we just need to trigger a brief refresh state
        setTimeout(() => setIsRefreshing(false), 500);
    }, []);

    async function onSignOut() {
        try {
            await signOut();
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Something went wrong.");
        }
    }

    const fullName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ")
        : null;

    return (
        <PageWithHeader
            title="Account"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}>
            <ErrorBoundary>
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 12 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                        />
                    }>
                    {isLoading && <ProfileSkeleton />}

                    {!isLoading && user && (
                        <View className="items-center mb-3">
                            {user.avatarUrl ? (
                                <Image
                                    source={{ uri: user.avatarUrl }}
                                    className="w-32 h-32 rounded-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="items-center justify-center w-24 h-24 rounded-full bg-muted">
                                    <Text
                                        style={{ fontSize: 32 }}
                                        className="font-semibold text-muted-foreground">
                                        {`${(user.firstName || "").charAt(0)}${(user.lastName || "").charAt(0)}`.toUpperCase() ||
                                            "U"}
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

                    {!isLoading && !user && (
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
                                    testID={`listitem-${item.key}`}
                                    onPress={() =>
                                        router.push(item.href as any)
                                    }
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
            </ErrorBoundary>
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
            true,
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
            <Block width={144} height={144} rounded="rounded-full" />
            <Block
                width={176}
                height={24}
                rounded="rounded-md"
                className="mt-3"
            />
            <Block
                width={128}
                height={20}
                rounded="rounded-md"
                className="mt-2"
            />
        </View>
    );
}
