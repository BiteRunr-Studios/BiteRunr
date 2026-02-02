import React, { useState } from "react";
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/convex-auth-context";
import Icon from "@/components/common/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";

export default function JoinOrderPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const { colorScheme } = useColorScheme();
    const { isReady, isLoggedIn } = useAuth();
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Validate the invite code
    const validation = useQuery(
        api.orderInvites.validateInvite,
        code ? { code: code.toUpperCase() } : "skip"
    );

    const joinOrder = useMutation(api.orderInvites.joinOrder);

    const handleJoin = async () => {
        if (!code) return;

        // If not logged in, redirect to sign-in with return URL
        if (!isLoggedIn) {
            router.replace(`/(auth)/sign-in?returnTo=/join/${code}`);
            return;
        }

        setIsJoining(true);
        setError(null);

        try {
            const result = await joinOrder({ code: code.toUpperCase() });

            if (result.alreadyMember) {
                // User is already in the order, navigate directly
                router.replace(`/(protected)/order/${result.orderId}`);
            } else {
                // Successfully joined, navigate to order
                router.replace(`/(protected)/order/${result.orderId}`);
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join order"
            );
            setIsJoining(false);
        }
    };

    const handleGoHome = () => {
        if (isLoggedIn) {
            router.replace("/(protected)/(tabs)");
        } else {
            router.replace("/(auth)/sign-in");
        }
    };

    // Loading state
    if (!isReady || validation === undefined) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator
                    size="large"
                    color={NAV_THEME[colorScheme].primary}
                />
                <Text className="text-muted-foreground mt-4">
                    Validating invite...
                </Text>
            </SafeAreaView>
        );
    }

    // Invalid invite
    if (!validation.valid) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 rounded-full bg-destructive/10 items-center justify-center mb-6">
                        <Icon
                            name="CircleX"
                            size={48}
                            color={NAV_THEME[colorScheme].notification}
                        />
                    </View>
                    <Text className="text-2xl font-bold text-foreground text-center mb-2">
                        Invalid Invite
                    </Text>
                    <Text className="text-base text-muted-foreground text-center mb-8">
                        {validation.error}
                    </Text>
                    <Pressable
                        onPress={handleGoHome}
                        className="px-8 py-4 rounded-xl bg-primary active:opacity-80">
                        <Text className="text-white font-semibold text-base">
                            Go to Home
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // Already a member - redirect directly
    if (validation.isAlreadyMember && validation.order) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
                        <Icon
                            name="CircleCheck"
                            size={48}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </View>
                    <Text className="text-2xl font-bold text-foreground text-center mb-2">
                        Already a Member
                    </Text>
                    <Text className="text-base text-muted-foreground text-center mb-8">
                        You're already part of this order
                    </Text>
                    <Pressable
                        onPress={() =>
                            router.replace(
                                `/(protected)/order/${validation.order!.id}`
                            )
                        }
                        className="px-8 py-4 rounded-xl bg-primary active:opacity-80">
                        <Text className="text-white font-semibold text-base">
                            View Order
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // Valid invite - show join preview
    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-border">
                <Pressable
                    onPress={handleGoHome}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon
                        name="ChevronLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
                <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                    Join Order
                </Text>
            </View>

            <View className="flex-1 items-center justify-center px-6">
                {/* Order Preview Card */}
                <View className="w-full bg-card border border-muted rounded-3xl p-6 items-center">
                    {/* Creator Avatar */}
                    {validation.creator?.avatarUrl ? (
                        <Image
                            source={{ uri: validation.creator.avatarUrl }}
                            className="w-20 h-20 rounded-full mb-4"
                        />
                    ) : (
                        <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                            <Text className="text-2xl font-bold text-primary">
                                {validation.creator?.firstName?.charAt(0) || "U"}
                                {validation.creator?.lastName?.charAt(0) || ""}
                            </Text>
                        </View>
                    )}

                    {/* Creator Name */}
                    <Text className="text-sm text-muted-foreground mb-1">
                        Hosted by
                    </Text>
                    <Text className="text-lg font-semibold text-foreground mb-4">
                        {validation.creator?.firstName}{" "}
                        {validation.creator?.lastName}
                    </Text>

                    {/* Divider */}
                    <View className="w-full h-px bg-muted mb-4" />

                    {/* Order Info */}
                    <Text className="text-sm text-muted-foreground mb-1">
                        ORDER
                    </Text>
                    <Text className="text-2xl font-bold text-foreground text-center mb-4">
                        {validation.order?.name}
                    </Text>

                    {/* Participant Count */}
                    <View className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-muted">
                        <Icon
                            name="Users"
                            size={16}
                            color={NAV_THEME[colorScheme].border}
                        />
                        <Text className="text-sm text-muted-foreground">
                            {validation.order?.participantCount}{" "}
                            {validation.order?.participantCount === 1
                                ? "person"
                                : "people"}{" "}
                            already joined
                        </Text>
                    </View>
                </View>

                {/* Error message */}
                {error && (
                    <View className="w-full mt-4 p-4 rounded-xl bg-destructive/10">
                        <Text className="text-destructive text-center">
                            {error}
                        </Text>
                    </View>
                )}

                {/* Join Button */}
                <Pressable
                    onPress={handleJoin}
                    disabled={isJoining}
                    className={`w-full mt-6 py-4 rounded-xl items-center ${
                        isJoining ? "bg-primary/50" : "bg-primary"
                    } active:opacity-80`}>
                    {isJoining ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-semibold text-lg">
                            {isLoggedIn ? "Join Order" : "Sign In to Join"}
                        </Text>
                    )}
                </Pressable>

                {!isLoggedIn && (
                    <Text className="text-sm text-muted-foreground text-center mt-4">
                        You'll be redirected to sign in first
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}
