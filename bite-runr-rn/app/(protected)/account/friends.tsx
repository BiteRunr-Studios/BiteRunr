import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";

type Tab = "friends" | "requests" | "search";

export default function FriendsScreen() {
    const [activeTab, setActiveTab] = useState<Tab>("friends");

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-border">
                <Pressable
                    onPress={() => router.back()}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon name="ChevronLeft" size={24} color="#f97316" />
                </Pressable>
                <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                    Friends
                </Text>
            </View>

            {/* Tab Selector */}
            <View className="flex-row gap-2 p-4">
                <TabButton
                    label="My Friends"
                    isActive={activeTab === "friends"}
                    onPress={() => setActiveTab("friends")}
                />
                <TabButton
                    label="Requests"
                    isActive={activeTab === "requests"}
                    onPress={() => setActiveTab("requests")}
                    showBadge
                />
                <TabButton
                    label="Search"
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
    isActive,
    onPress,
    showBadge,
}: {
    label: string;
    isActive: boolean;
    onPress: () => void;
    showBadge?: boolean;
}) {
    const pendingCount = useQuery(api.friends.pendingRequestCount);
    const hasPending =
        showBadge && typeof pendingCount === "number" && pendingCount > 0;

    return (
        <Pressable
            onPress={onPress}
            className={`flex-1 py-2.5 px-3 rounded-xl items-center ${
                isActive ? "bg-primary" : "bg-muted"
            }`}>
            <View className="flex-row items-center gap-1.5">
                <Text
                    className={`font-medium ${
                        isActive ? "text-white" : "text-foreground"
                    }`}>
                    {label}
                </Text>
                {hasPending && (
                    <View className="items-center justify-center w-5 h-5 bg-red-500 rounded-full">
                        <Text className="text-xs font-semibold text-white">
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
            <View className="items-center justify-center flex-1">
                <ActivityIndicator size="large" color="#f97316" />
            </View>
        );
    }

    if (!friends || friends.length === 0) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <Icon name="User" size={64} color="#666" />
                <Text className="mt-4 text-lg font-medium text-center text-foreground">
                    No friends yet
                </Text>
                <Text className="mt-2 text-center text-muted-foreground">
                    Search for people to add them as friends
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingBottom: 20 }}>
            {friends.map((friend) => (
                <FriendCard
                    key={friend.id}
                    id={friend.id}
                    firstName={friend.firstName}
                    lastName={friend.lastName}
                    avatarUrl={friend.avatarUrl}
                    onRemove={() =>
                        handleRemoveFriend(
                            friend.id,
                            `${friend.firstName} ${friend.lastName}`
                        )
                    }
                    isRemoving={removingId === friend.id}
                />
            ))}
        </ScrollView>
    );
}

function FriendRequests() {
    const requests = useQuery(api.friends.listPendingRequests);
    const acceptRequest = useMutation(api.friends.acceptRequest);
    const rejectRequest = useMutation(api.friends.rejectRequest);
    const [processingId, setProcessingId] = useState<string | null>(null);

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
            <View className="items-center justify-center flex-1">
                <ActivityIndicator size="large" color="#f97316" />
            </View>
        );
    }

    if (!requests || requests.length === 0) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <Icon name="Mail" size={64} color="#666" />
                <Text className="mt-4 text-lg font-medium text-center text-foreground">
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
            {requests.map((request) => (
                <RequestCard
                    key={request.id}
                    request={request}
                    onAccept={() => handleAccept(request.id)}
                    onReject={() => handleReject(request.id)}
                    isProcessing={processingId === request.id}
                />
            ))}
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
                rightIcon="CircleX"
                onRightIconPress={() => setSearchQuery("")}
                rightIconColor="#666"
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
            />

            {/* Search Results */}
            {searchQuery.length < 2 && (
                <View className="items-center justify-center flex-1">
                    <Icon name="Search" size={64} color="#666" />
                    <Text className="mt-4 text-center text-muted-foreground">
                        Enter at least 2 characters to search
                    </Text>
                </View>
            )}

            {isSearching && (
                <View className="items-center justify-center flex-1">
                    <ActivityIndicator size="large" color="#f97316" />
                </View>
            )}

            {searchQuery.length >= 2 &&
                searchResults &&
                searchResults.length === 0 && (
                    <View className="items-center justify-center flex-1">
                        <Icon name="User" size={64} color="#666" />
                        <Text className="mt-4 text-lg font-medium text-center text-foreground">
                            No users found
                        </Text>
                        <Text className="mt-2 text-center text-muted-foreground">
                            Try a different search term
                        </Text>
                    </View>
                )}

            {searchResults && searchResults.length > 0 && (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 20 }}>
                    {searchResults.map((user) => (
                        <SearchResultCard
                            key={user.id}
                            user={user}
                            onSendRequest={() =>
                                handleSendRequest(
                                    user.id,
                                    `${user.firstName} ${user.lastName}`
                                )
                            }
                            isSending={sendingTo === user.id}
                        />
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

function FriendCard({
    id,
    firstName,
    lastName,
    avatarUrl,
    onRemove,
    isRemoving,
}: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    onRemove: () => void;
    isRemoving: boolean;
}) {
    const fullName = `${firstName} ${lastName}`;

    return (
        <View className="flex-row items-center p-3 mb-3 border rounded-xl border-muted">
            <Avatar name={fullName} avatarUrl={avatarUrl} size={48} />
            <View className="flex-1 ml-3">
                <Text className="text-base font-semibold text-foreground">
                    {fullName}
                </Text>
            </View>
            <Pressable
                onPress={onRemove}
                disabled={isRemoving}
                className="p-2 rounded-lg active:opacity-70">
                {isRemoving ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                    <Icon name="UserMinus" size={20} color="#ef4444" />
                )}
            </Pressable>
        </View>
    );
}

function RequestCard({
    request,
    onAccept,
    onReject,
    isProcessing,
}: {
    request: {
        id: Id<"friendRequests">;
        sender: {
            id: Id<"users">;
            firstName: string;
            lastName: string;
            avatarUrl?: string;
        } | null;
    };
    onAccept: () => void;
    onReject: () => void;
    isProcessing: boolean;
}) {
    if (!request.sender) return null;

    const fullName = `${request.sender.firstName} ${request.sender.lastName}`;

    return (
        <View className="p-3 mb-3 border rounded-xl border-muted">
            <View className="flex-row items-center">
                <Avatar
                    name={fullName}
                    avatarUrl={request.sender.avatarUrl}
                    size={48}
                />
                <View className="flex-1 ml-3">
                    <Text className="text-base font-semibold text-foreground">
                        {fullName}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                        Sent you a friend request
                    </Text>
                </View>
            </View>
            <View className="flex-row gap-3 mt-3">
                <Pressable
                    onPress={onReject}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl border border-muted items-center active:opacity-70">
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#666" />
                    ) : (
                        <Text className="font-medium text-foreground">
                            Decline
                        </Text>
                    )}
                </Pressable>
                <Pressable
                    onPress={onAccept}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-primary items-center active:opacity-70">
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text className="font-medium text-white">Accept</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

function SearchResultCard({
    user,
    onSendRequest,
    isSending,
}: {
    user: {
        id: Id<"users">;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string;
    };
    onSendRequest: () => void;
    isSending: boolean;
}) {
    const fullName = `${user.firstName} ${user.lastName}`;

    return (
        <View className="flex-row items-center p-3 mb-3 border rounded-xl border-muted">
            <Avatar name={fullName} avatarUrl={user.avatarUrl} size={48} />
            <View className="flex-1 ml-3">
                <Text className="text-base font-semibold text-foreground">
                    {fullName}
                </Text>
                <Text className="text-sm text-muted-foreground">
                    {user.email}
                </Text>
            </View>
            <Pressable
                onPress={onSendRequest}
                disabled={isSending}
                className="px-4 py-2 rounded-xl bg-primary active:opacity-70">
                {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text className="font-medium text-white">Add</Text>
                )}
            </Pressable>
        </View>
    );
}

function Avatar({
    name,
    avatarUrl,
    size = 48,
}: {
    name: string;
    avatarUrl?: string;
    size?: number;
}) {
    if (avatarUrl) {
        return (
            <Image
                source={{ uri: avatarUrl }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
                resizeMode="cover"
            />
        );
    }

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
            }}
            className="items-center justify-center bg-muted">
            <Text
                className="font-semibold text-muted-foreground"
                style={{ fontSize: size * 0.35 }}>
                {name.slice(0, 2).toUpperCase()}
            </Text>
        </View>
    );
}
