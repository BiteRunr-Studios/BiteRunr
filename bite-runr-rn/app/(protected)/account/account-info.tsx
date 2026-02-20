import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/common/input";
import * as ImagePicker from "expo-image-picker";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Avatar } from "@/components/common/avatar";

export default function AccountInfoScreen() {
    const user = useQuery(api.users.getCurrentUser);
    const updateProfile = useMutation(api.users.updateProfile);
    const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
    const updateAvatar = useMutation(api.users.updateAvatar);
    const removeAvatar = useMutation(api.users.removeAvatar);

    const { colorScheme } = useColorScheme();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isLoading = user === undefined;

    // Initialize form with user data
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
        }
    }, [user]);

    // Track changes
    useEffect(() => {
        if (user) {
            const changed =
                firstName !== (user.firstName || "") ||
                lastName !== (user.lastName || "");
            setHasChanges(changed);
        }
    }, [firstName, lastName, user]);

    const handleSave = async () => {
        if (!firstName.trim()) {
            Alert.alert("Error", "First name is required");
            return;
        }

        setIsSaving(true);
        try {
            await updateProfile({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            });
            Alert.alert("Success", "Your profile has been updated");
            setHasChanges(false);
        } catch (error: any) {
            Alert.alert("Error", error?.message ?? "Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const pickImage = async () => {
        const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert(
                "Permission Required",
                "Please allow access to your photo library to change your avatar."
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (imageUri: string) => {
        setIsUploadingAvatar(true);
        try {
            const uploadUrl = await generateUploadUrl();
            const response = await fetch(imageUri);
            const blob = await response.blob();

            const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "Content-Type": blob.type || "image/jpeg",
                },
                body: blob,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image");
            }

            const responseData = await uploadResponse.json();
            if (!responseData.storageId) {
                throw new Error("Invalid upload response: missing storageId");
            }
            const { storageId } = responseData;

            await updateAvatar({ storageId: storageId as Id<"_storage"> });
            Alert.alert("Success", "Your avatar has been updated");
        } catch (error: any) {
            console.error("Avatar upload error:", error);
            Alert.alert("Error", error?.message ?? "Failed to upload avatar");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleRemoveAvatar = () => {
        Alert.alert(
            "Remove Avatar",
            "Are you sure you want to remove your profile photo?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        setIsUploadingAvatar(true);
                        try {
                            await removeAvatar();
                            Alert.alert(
                                "Success",
                                "Your avatar has been removed"
                            );
                        } catch (error: any) {
                            Alert.alert(
                                "Error",
                                error?.message ?? "Failed to remove avatar"
                            );
                        } finally {
                            setIsUploadingAvatar(false);
                        }
                    },
                },
            ]
        );
    };

    const showAvatarOptions = () => {
        const options = user?.avatarUrl
            ? [
                  { text: "Change Photo", onPress: pickImage },
                  {
                      text: "Remove Photo",
                      onPress: handleRemoveAvatar,
                      style: "destructive" as const,
                  },
                  { text: "Cancel", style: "cancel" as const },
              ]
            : [
                  { text: "Choose Photo", onPress: pickImage },
                  { text: "Cancel", style: "cancel" as const },
              ];

        Alert.alert("Profile Photo", "What would you like to do?", options);
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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
                        Personal Information
                    </Text>
                </View>
                <View className="items-center justify-center flex-1">
                    <ActivityIndicator
                        size="large"
                        color={NAV_THEME[colorScheme].primary}
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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
                        Personal Information
                    </Text>
                </View>
                <View className="items-center justify-center flex-1 px-6">
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
                        Please sign in to view your profile
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

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
                    Personal Information
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {/* Avatar Section */}
                    <View className="items-center p-6 mb-6 border rounded-2xl border-muted bg-card">
                        <Pressable
                            onPress={showAvatarOptions}
                            disabled={isUploadingAvatar}
                            className="relative active:opacity-80">
                            <Avatar
                                name={`${firstName || user.firstName || ""} ${lastName || user.lastName || ""}`}
                                avatarUrl={user.avatarUrl}
                                size={128}
                            />

                            {/* Camera overlay */}
                            <View className="absolute bottom-0 right-0 items-center justify-center border-4 rounded-full w-11 h-11 bg-primary border-card">
                                {isUploadingAvatar ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Icon name="Camera" size={20} color="#fff" />
                                )}
                            </View>
                        </Pressable>

                        <Text className="mt-4 text-sm text-muted-foreground">
                            Tap to change your profile photo
                        </Text>
                    </View>

                    {/* Form Fields */}
                    <View className="gap-4">
                        {/* First Name */}
                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                                    <Icon name="User" size={16} color="#3b82f6" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    First Name
                                </Text>
                            </View>
                            <Input
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Enter your first name"
                                errorMessage={null}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Last Name */}
                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                                    <Icon name="User" size={16} color="#3b82f6" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    Last Name
                                </Text>
                            </View>
                            <Input
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Enter your last name"
                                errorMessage={null}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Email (Read-only) */}
                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10">
                                    <Icon name="Mail" size={16} color="#a855f7" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    Email Address
                                </Text>
                                <View className="flex-row items-center gap-1 px-2 py-0.5 ml-auto rounded-full bg-muted">
                                    <Icon name="Lock" size={10} color="#6b7280" />
                                    <Text className="text-xs text-muted-foreground">
                                        Locked
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row items-center px-4 py-3.5 rounded-xl bg-muted/50">
                                <Text className="flex-1 text-base text-foreground">
                                    {user.email}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`flex-row items-center justify-center gap-2 py-4 mt-6 rounded-xl ${
                            !hasChanges || isSaving ? "bg-muted opacity-60" : "bg-primary"
                        }`}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#6b7280" />
                        ) : (
                            <>
                                <Icon
                                    name="Check"
                                    size={20}
                                    color={hasChanges ? "white" : "#6b7280"}
                                />
                                <Text
                                    className={`font-semibold ${
                                        hasChanges
                                            ? "text-white"
                                            : "text-muted-foreground"
                                    }`}>
                                    Save Changes
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Account Info */}
                    <View className="items-center mt-8">
                        <View className="flex-row items-center gap-1.5">
                            <Icon
                                name="Calendar"
                                size={14}
                                color={NAV_THEME[colorScheme].border}
                            />
                            <Text className="text-sm text-muted-foreground">
                                Member since{" "}
                                {user._creationTime
                                    ? new Date(
                                          user._creationTime
                                      ).toLocaleDateString("en-US", {
                                          month: "long",
                                          year: "numeric",
                                      })
                                    : "Unknown"}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
