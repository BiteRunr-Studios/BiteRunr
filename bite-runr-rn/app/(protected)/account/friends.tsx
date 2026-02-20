import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { Avatar } from "@/components/common/avatar";

type Tab = "friends" | "requests" | "search";

export default function FriendsScreen() {
    const [activeTab, setActiveTab] = useState<Tab>("friends");
    const { colorScheme } = useColorScheme();

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-border">
                <Pressable
                    onPress={() => router.back()}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon
                        name="ChevronLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
                <Text className="flex-1 ml-2 text-xl font-bold text-foreground">
                    Friends
                </Text>
            </View>

            {/* Tab Selector */}
            <View className="flex-row gap-2 p-4">
                <TabButton
                    label="My Friends"
                    icon="Users"
                    isActive={activeTab === "friends"}
                    onPress={() => setActiveTab("friends")}
                />
                <TabButton
                    label="Requests"
                    icon="Bell"
                    isActive={activeTab === "requests"}
                    onPress={() => setActiveTab("requests")}
                    showBadge
                />
                <TabButton
                    label="Search"
                    icon="Search"
                    isActive={activeTab === "search"}
                    onPress={() => setActiveTab("search")}
                />
            </View>

            {/* Content */}
            {activeTab === "friends" && <FriendsList />}
            {activeTab === "requests" && <FriendRequests />}
            {activeTab === "search" && <SearchUsers />}
        </SafeAreaView>
    );
}

function TabButton({
    label,
    icon,
    isActive,
    onPress,
    showBadge,
}: {
    label: string;
    icon: "Users" | "Bell" | "Search";
    isActive: boolean;
    onPress: () => void;
    showBadge?: boolean;
}) {
    const { colorScheme } = useColorScheme();
    const pendingCount = useQuery(
        api.friends.pendingRequestCount,
        showBadge ? {} : "skip"
    );
    const hasPending =
        showBadge && typeof pendingCount === "number" && pendingCount > 0;

    return (
        <Pressable
            onPress={onPress}
            className={`flex-1 py-3 rounded-xl items-center ${
                isActive ? "bg-primary" : "bg-muted"
            }`}>
            <View className="flex-row items-center gap-1.5">
                <Icon
                    name={icon}
                    size={16}
                    color={isActive ? "white" : NAV_THEME[colorScheme].text}
                />
                <Text
                    className={`font-medium text-sm ${
                        isActive ? "text-white" : "text-foreground"
                    }`}>
                    {label}
                </Text>
                {hasPending && (
                    <View className="items-center justify-center w-5 h-5 ml-1 bg-red-500 rounded-full">
                        <Text className="text-xs font-bold text-white">
                            {pendingCount > 9 ? "9+" : pendingCount}
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

function FriendsList() {
    const friends = useQuery(api.friends.list);
    const removeFriend = useMutation(api.friends.removeFriend);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const { colorScheme } = useColorScheme();

    const isLoading = friends === undefined;

    const handleRemoveFriend = (friendId: Id<"users">, friendName: string) => {
        Alert.alert(
            "Remove Friend",
            `Are you sure you want to remove ${friendName} from your friends?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        setRemovingId(friendId);
                        try {
                            await removeFriend({ friendId });
                        } catch (error: any) {
                            Alert.alert(
                                "Error",
                                error?.message ?? "Failed to remove friend"
                            );
                        } finally {
                            setRemovingId(null);
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <ScrollView
                className="flex-1 px-4"
                contentContainerStyle={{ paddingBottom: 20 }}>
                <Skeleton>
                    <View className="gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <FriendCardSkeleton key={i} />
                        ))}
                    </View>
                </Skeleton>
            </ScrollView>
        );
    }

    if (!friends || friends.length === 0) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <View className="items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-green-500/10">
                    <Icon name="Users" size={40} color="#22c55e" />
                </View>
                <Text className="text-lg font-semibold text-foreground">
                    No friends yet
                </Text>
                <Text className="mt-2 text-center text-muted-foreground">
                    Search for people to add them as friends and start ordering
                    together
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="gap-3">
                {friends.map((friend) => (
                    <View
                        key={friend.id}
                        className="flex-row items-center p-4 border rounded-xl border-muted bg-card">
                        <Avatar
                            name={`${friend.firstName} ${friend.lastName}`}
                            avatarUrl={friend.avatarUrl}
                            size={52}
                        />
                        <View className="flex-1 ml-3">
                            <Text className="text-base font-semibold text-foreground">
                                {friend.firstName} {friend.lastName}
                            </Text>
                            <View className="flex-row items-center gap-1 mt-1">
                                <Icon
                                    name="UserCheck"
                                    size={12}
                                    color="#22c55e"
                                />
                                <Text className="text-sm text-green-500">
                                    Friends
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() =>
                                handleRemoveFriend(
                                    friend.id,
                                    `${friend.firstName} ${friend.lastName}`
                                )
                            }
                            disabled={removingId === friend.id}
                            className="items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 active:opacity-70">
                            {removingId === friend.id ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Icon name="UserMinus" size={20} color="#ef4444" />
                            )}
                        </Pressable>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

function FriendRequests() {
    const requests = useQuery(api.friends.listPendingRequests);
    const acceptRequest = useMutation(api.friends.acceptRequest);
    const rejectRequest = useMutation(api.friends.rejectRequest);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { colorScheme } = useColorScheme();

    const isLoading = requests === undefined;

    const handleAccept = async (requestId: Id<"friendRequests">) => {
        setProcessingId(requestId);
        try {
            await acceptRequest({ requestId });
        } catch (error: any) {
            Alert.alert("Error", error?.message ?? "Failed to accept request");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId: Id<"friendRequests">) => {
        setProcessingId(requestId);
        try {
            await rejectRequest({ requestId });
        } catch (error: any) {
            Alert.alert("Error", error?.message ?? "Failed to reject request");
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return (
            <ScrollView
                className="flex-1 px-4"
                contentContainerStyle={{ paddingBottom: 20 }}>
                <Skeleton>
                    <View className="gap-3">
                        {[1, 2, 3].map((i) => (
                            <FriendRequestSkeleton key={i} />
                        ))}
                    </View>
                </Skeleton>
            </ScrollView>
        );
    }

    if (!requests || requests.length === 0) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <View className="items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-orange-500/10">
                    <Icon name="Bell" size={40} color="#f97316" />
                </View>
                <Text className="text-lg font-semibold text-foreground">
                    No pending requests
                </Text>
                <Text className="mt-2 text-center text-muted-foreground">
                    When someone sends you a friend request, it will appear here
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="gap-3">
                {requests.map((request) => {
                    if (!request.sender) return null;

                    const fullName = `${request.sender.firstName} ${request.sender.lastName}`;

                    return (
                        <View
                            key={request.id}
                            className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center">
                                <View className="relative">
                                    <Avatar
                                        name={fullName}
                                        avatarUrl={request.sender.avatarUrl}
                                        size={52}
                                    />
                                    <View className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full items-center justify-center border-2 border-card bg-primary">
                                        <Icon name="UserPlus" size={10} color="white" />
                                    </View>
                                </View>
                                <View className="flex-1 ml-3">
                                    <Text className="text-base font-semibold text-foreground">
                                        {fullName}
                                    </Text>
                                    <Text className="mt-0.5 text-sm text-muted-foreground">
                                        Wants to be your friend
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row gap-3 mt-4">
                                <TouchableOpacity
                                    onPress={() => handleReject(request.id)}
                                    disabled={processingId === request.id}
                                    className="flex-1 flex-row items-center justify-center gap-2 py-3 border rounded-xl border-muted active:opacity-70">
                                    {processingId === request.id ? (
                                        <ActivityIndicator size="small" color="#666" />
                                    ) : (
                                        <>
                                            <Icon name="X" size={16} color="#666" />
                                            <Text className="font-medium text-foreground">
                                                Decline
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleAccept(request.id)}
                                    disabled={processingId === request.id}
                                    className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-primary active:opacity-70">
                                    {processingId === request.id ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Icon name="Check" size={16} color="white" />
                                            <Text className="font-medium text-white">
                                                Accept
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

function SearchUsers() {
    const [searchQuery, setSearchQuery] = useState("");
    const searchResults = useQuery(
        api.friends.searchUsers,
        searchQuery.length >= 2 ? { query: searchQuery } : "skip"
    );
    const sendRequest = useMutation(api.friends.sendRequest);
    const [sendingTo, setSendingTo] = useState<string | null>(null);
    const { colorScheme } = useColorScheme();

    const isSearching = searchQuery.length >= 2 && searchResults === undefined;

    const handleSendRequest = async (userId: Id<"users">, userName: string) => {
        setSendingTo(userId);
        try {
            await sendRequest({ receiverId: userId });
            Alert.alert("Request Sent", `Friend request sent to ${userName}`);
        } catch (error: any) {
            Alert.alert(
                "Error",
                error?.message ?? "Failed to send friend request"
            );
        } finally {
            setSendingTo(null);
        }
    };

    return (
        <View className="flex-1 px-4">
            {/* Search Input */}
            <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                leftIcon="Search"
                errorMessage=""
                rightIcon={searchQuery.length > 0 ? "CircleX" : undefined}
                onRightIconPress={() => setSearchQuery("")}
                rightIconColor="#666"
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
            />

            {/* Search Results */}
            {searchQuery.length < 2 && (
                <View className="items-center justify-center flex-1">
                    <View className="items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-blue-500/10">
                        <Icon name="Search" size={40} color="#3b82f6" />
                    </View>
                    <Text className="text-lg font-semibold text-foreground">
                        Find Friends
                    </Text>
                    <Text className="mt-2 text-center text-muted-foreground">
                        Enter at least 2 characters to search
                    </Text>
                </View>
            )}

            {isSearching && (
                <View className="flex-1 mt-4">
                    <Skeleton>
                        <View className="gap-3">
                            {[1, 2, 3].map((i) => (
                                <FriendCardSkeleton key={i} />
                            ))}
                        </View>
                    </Skeleton>
                </View>
            )}

            {searchQuery.length >= 2 &&
                searchResults &&
                searchResults.length === 0 && (
                    <View className="items-center justify-center flex-1">
                        <View className="items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-purple-500/10">
                            <Icon name="UserX" size={40} color="#a855f7" />
                        </View>
                        <Text className="text-lg font-semibold text-foreground">
                            No users found
                        </Text>
                        <Text className="mt-2 text-center text-muted-foreground">
                            Try a different search term
                        </Text>
                    </View>
                )}

            {searchResults && searchResults.length > 0 && (
                <ScrollView
                    className="flex-1 mt-4"
                    contentContainerStyle={{ paddingBottom: 20 }}>
                    <View className="gap-3">
                        {searchResults.map((user) => {
                            const fullName = `${user.firstName} ${user.lastName}`;

                            return (
                                <View
                                    key={user.id}
                                    className="flex-row items-center p-4 border rounded-xl border-muted bg-card">
                                    <Avatar
                                        name={fullName}
                                        avatarUrl={user.avatarUrl}
                                        size={52}
                                    />
                                    <View className="flex-1 ml-3">
                                        <Text className="text-base font-semibold text-foreground">
                                            {fullName}
                                        </Text>
                                        <View className="flex-row items-center gap-1 mt-1">
                                            <Icon
                                                name="Mail"
                                                size={12}
                                                color={NAV_THEME[colorScheme].border}
                                            />
                                            <Text
                                                className="text-sm text-muted-foreground"
                                                numberOfLines={1}>
                                                {user.email}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() =>
                                            handleSendRequest(user.id, fullName)
                                        }
                                        disabled={sendingTo === user.id}
                                        className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl bg-primary active:opacity-70">
                                        {sendingTo === user.id ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#fff"
                                            />
                                        ) : (
                                            <>
                                                <Icon
                                                    name="UserPlus"
                                                    size={16}
                                                    color="white"
                                                />
                                                <Text className="font-semibold text-white">
                                                    Add
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

function FriendCardSkeleton() {
    return (
        <View className="flex-row items-center p-4 border rounded-xl border-muted bg-card">
            <SkeletonBlock width={52} height={52} rounded="rounded-full" />
            <View className="flex-1 ml-3">
                <SkeletonBlock width={140} height={18} className="mb-2" />
                <SkeletonBlock width={80} height={14} />
            </View>
            <SkeletonBlock width={40} height={40} rounded="rounded-xl" />
        </View>
    );
}

function FriendRequestSkeleton() {
    return (
        <View className="p-4 border rounded-xl border-muted bg-card">
            <View className="flex-row items-center">
                <SkeletonBlock width={52} height={52} rounded="rounded-full" />
                <View className="flex-1 ml-3">
                    <SkeletonBlock width={140} height={18} className="mb-2" />
                    <SkeletonBlock width={160} height={14} />
                </View>
            </View>
            <View className="flex-row gap-3 mt-4">
                <View className="flex-1">
                    <SkeletonBlock width="100%" height={44} rounded="rounded-xl" />
                </View>
                <View className="flex-1">
                    <SkeletonBlock width="100%" height={44} rounded="rounded-xl" />
                </View>
            </View>
        </View>
    );
}
