import React, { useContext, useState, useCallback } from "react";
import {
    ScrollView,
    Text,
    View,
    Alert,
    Pressable,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { AuthContext } from "@/lib/convex-auth-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import type { icons } from "lucide-react-native";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderBar } from "@/components/layout/header-bar";
import { Avatar } from "@/components/common/avatar";

type Item = {
    key: string;
    title: string;
    subtitle: string;
    icon: keyof typeof icons;
    iconBg: string;
    iconColor: string;
    href: string;
};

const items: Item[] = [
    {
        key: "friends",
        title: "Friends",
        subtitle: "View, make & manage friends",
        icon: "Users",
        iconBg: "bg-green-500/10",
        iconColor: "#22c55e",
        href: "/account/friends",
    },
    {
        key: "payments",
        title: "Payments",
        subtitle: "View & claim owed amounts",
        icon: "CreditCard",
        iconBg: "bg-purple-500/10",
        iconColor: "#a855f7",
        href: "/account/payments",
    },
    {
        key: "support",
        title: "Support",
        subtitle: "Report an issue with the app",
        icon: "Headset",
        iconBg: "bg-orange-500/10",
        iconColor: "#f97316",
        href: "/account/support",
    },
    {
        key: "about",
        title: "About",
        subtitle: "Release notes & about us",
        icon: "Info",
        iconBg: "bg-gray-500/10",
        iconColor: "#6b7280",
        href: "/account/about",
    },
];

const STRIPE_IDENTITY_REQUIREMENT_FIELDS = [
    "verification.document",
    "verification.additional_document",
    "proof_of_liveness",
    "person.verification.proof_of_liveness",
];

function hasIdentityVerificationRequirement(requirements: string[]) {
    return requirements.some((field) =>
        STRIPE_IDENTITY_REQUIREMENT_FIELDS.some((requirement) =>
            field.includes(requirement),
        ),
    );
}

export default function AccountTab() {
    const { signOut } = useContext(AuthContext);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();

    const user = useQuery(api.users.getCurrentUser);
    const pendingCount = useQuery(api.friends.pendingRequestCount);
    const connectedAccount = useQuery(api.payments.getMyConnectedAccount);
    const isLoading = user === undefined;
    const payoutRequirements = [
        ...(connectedAccount?.requirementsCurrentlyDue ?? []),
        ...(connectedAccount?.requirementsPastDue ?? []),
    ];
    const needsPayoutIdentityVerification =
        !!connectedAccount &&
        !connectedAccount.payoutsEnabled &&
        hasIdentityVerificationRequirement(payoutRequirements);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
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
        <ErrorBoundary>
            <View style={{ paddingTop: insets.top }} className="flex-1 bg-background">
            <HeaderBar />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                }>
                    {isLoading && <ProfileSkeleton />}

                    {!isLoading && user && (
                        <>
                            {/* Profile Card */}
                            <Pressable
                                onPress={() =>
                                    router.push("/account/account-info")
                                }
                                className="p-5 mb-6 border rounded-2xl border-muted bg-card active:opacity-90">
                                <View className="flex-row items-center">
                                    <View className="relative">
                                        <Avatar
                                            name={fullName || "U"}
                                            avatarUrl={user.avatarUrl}
                                            size={80}
                                        />
                                        <View className="absolute bottom-0 right-0 items-center justify-center border-2 rounded-full w-7 h-7 bg-primary border-card">
                                            <Icon
                                                name="Pencil"
                                                size={12}
                                                color="white"
                                            />
                                        </View>
                                    </View>
                                    <View className="flex-1 ml-4">
                                        <Text className="text-xl font-bold text-foreground">
                                            {fullName || "Unknown User"}
                                        </Text>
                                        <View className="flex-row items-center gap-1.5 mt-1">
                                            <Icon
                                                name="Mail"
                                                size={14}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .border
                                                }
                                            />
                                            <Text
                                                className="text-sm text-muted-foreground"
                                                numberOfLines={1}>
                                                {user.email}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1.5 mt-1">
                                            <Icon
                                                name="Calendar"
                                                size={14}
                                                color={
                                                    NAV_THEME[colorScheme]
                                                        .border
                                                }
                                            />
                                            <Text className="text-sm text-muted-foreground">
                                                Member since{" "}
                                                {new Date(
                                                    user._creationTime,
                                                ).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                    <Icon
                                        name="ChevronRight"
                                        size={20}
                                        color={NAV_THEME[colorScheme].border}
                                    />
                                </View>
                            </Pressable>

                            {/* Menu Items */}
                            {needsPayoutIdentityVerification && (
                                <Pressable
                                    onPress={() => router.push("/account/payments")}
                                    className="flex-row items-start p-4 mb-3 border rounded-xl active:opacity-90"
                                    style={{
                                        borderColor: "#f59e0b40",
                                        backgroundColor: "#f59e0b12",
                                    }}>
                                    <View className="items-center justify-center w-12 h-12 rounded-xl bg-amber-500/15">
                                        <Icon
                                            name="CircleAlert"
                                            size={22}
                                            color="#d97706"
                                        />
                                    </View>
                                    <View className="flex-1 ml-3">
                                        <Text
                                            className="text-base font-semibold"
                                            style={{ color: "#b45309" }}>
                                            Finish setup to get paid
                                        </Text>
                                        <Text className="mt-0.5 text-sm text-muted-foreground">
                                            We use Stripe to safely confirm
                                            your information before money can be
                                            sent to you.
                                        </Text>
                                    </View>
                                    <Icon
                                        name="ChevronRight"
                                        size={20}
                                        color="#d97706"
                                    />
                                </Pressable>
                            )}

                            <View className="gap-3">
                                {items.map((item) => (
                                    <Pressable
                                        key={item.key}
                                        onPress={() =>
                                            router.push(item.href as any)
                                        }
                                        className="flex-row items-center p-4 border rounded-xl border-muted bg-card active:opacity-90">
                                        <View
                                            className={`items-center justify-center w-12 h-12 rounded-xl ${item.iconBg}`}>
                                            <Icon
                                                name={item.icon}
                                                size={24}
                                                color={item.iconColor}
                                            />
                                        </View>
                                        <View className="flex-1 ml-3">
                                            <Text className="text-base font-semibold text-foreground">
                                                {item.title}
                                            </Text>
                                            <Text className="mt-0.5 text-sm text-muted-foreground">
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                        {item.key === "friends" && typeof pendingCount === "number" && pendingCount > 0 && (
                                            <View className="items-center justify-center w-6 h-6 mr-2 bg-red-500 rounded-full">
                                                <Text className="text-xs font-bold text-white">
                                                    {pendingCount > 9 ? "9+" : pendingCount}
                                                </Text>
                                            </View>
                                        )}
                                        <Icon
                                            name="ChevronRight"
                                            size={20}
                                            color={
                                                NAV_THEME[colorScheme].border
                                            }
                                        />
                                    </Pressable>
                                ))}
                            </View>

                            {/* Sign Out Button */}
                            <TouchableOpacity
                                onPress={onSignOut}
                                className="flex-row items-center justify-center gap-2 py-4 mt-6 border rounded-xl border-destructive active:opacity-80">
                                <Icon name="LogOut" size={20} color="#ef4444" />
                                <Text className="font-semibold text-destructive">
                                    Sign out
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {!isLoading && !user && (
                        <View className="items-center p-8 rounded-2xl bg-card">
                            <View className="items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-muted">
                                <Icon
                                    name="User"
                                    size={40}
                                    color={NAV_THEME[colorScheme].border}
                                />
                            </View>
                            <Text className="text-lg font-semibold text-foreground">
                                Not signed in
                            </Text>
                            <Text className="mt-2 text-center text-muted-foreground">
                                Please sign in to see your profile
                            </Text>
                        </View>
                    )}
            </ScrollView>
            </View>
        </ErrorBoundary>
    );
}

function ProfileSkeleton() {
    return (
        <Skeleton>
            <View>
                {/* Profile Card Skeleton */}
                <View className="flex-row items-center p-5 mb-6 border rounded-2xl border-muted bg-card">
                    <SkeletonBlock width={80} height={80} rounded="rounded-full" />
                    <View className="flex-1 ml-4">
                        <SkeletonBlock width={160} height={24} className="mb-2" />
                        <SkeletonBlock width={200} height={16} className="mb-2" />
                        <SkeletonBlock width={140} height={16} />
                    </View>
                </View>

                {/* Menu Items Skeleton */}
                <View className="gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View
                            key={i}
                            className="flex-row items-center p-4 border rounded-xl border-muted bg-card">
                            <SkeletonBlock width={48} height={48} rounded="rounded-xl" />
                            <View className="flex-1 ml-3">
                                <SkeletonBlock width={140} height={20} className="mb-2" />
                                <SkeletonBlock width={180} height={16} />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </Skeleton>
    );
}
