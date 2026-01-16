import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/common/input";
import { Button } from "@/components/common/button";
import * as ImagePicker from "expo-image-picker";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

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

    const getInitials = () => {
        const first = firstName.trim() || user?.firstName || "";
        const last = lastName.trim() || user?.lastName || "";
        const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
        return initials || "U";
    };

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
        // Request permission
        const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert(
                "Permission Required",
                "Please allow access to your photo library to change your avatar."
            );
            return;
        }

        // Launch image picker
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
            // Get upload URL from Convex
            const uploadUrl = await generateUploadUrl();

            // Fetch the image and convert to blob
            const response = await fetch(imageUri);
            const blob = await response.blob();

            // Upload to Convex storage
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

            // Save the storage ID to the user's profile
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
                    <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
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
                    <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                        Personal Information
                    </Text>
                </View>
                <View className="items-center justify-center flex-1 px-6">
                    <Icon name="User" size={64} color="#666" />
                    <Text className="mt-4 text-lg font-medium text-center text-foreground">
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
                <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                    Personal Information
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    keyboardShouldPersistTaps="handled">
                    {/* Avatar Section */}
                    <View className="items-center mb-6">
                        <Pressable
                            onPress={showAvatarOptions}
                            disabled={isUploadingAvatar}
                            className="relative active:opacity-80">
                            {user.avatarUrl ? (
                                <Image
                                    source={{ uri: user.avatarUrl }}
                                    className="rounded-full w-28 h-28"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="items-center justify-center rounded-full w-28 h-28 bg-muted">
                                    <Text
                                        style={{ fontSize: 36 }}
                                        className="font-semibold text-muted-foreground">
                                        {getInitials()}
                                    </Text>
                                </View>
                            )}

                            {/* Camera overlay */}
                            <View className="absolute bottom-0 right-0 items-center justify-center rounded-full w-9 h-9 bg-primary">
                                {isUploadingAvatar ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#fff"
                                    />
                                ) : (
                                    <Icon
                                        name="Camera"
                                        size={18}
                                        color="#fff"
                                    />
                                )}
                            </View>
                        </Pressable>

                        <Text className="mt-3 text-sm text-center text-muted-foreground">
                            Tap to change your profile photo
                        </Text>
                    </View>

                    {/* Form Fields */}
                    <View className="gap-4">
                        {/* First Name */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-muted-foreground">
                                First Name
                            </Text>
                            <Input
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Enter your first name"
                                leftIcon="User"
                                errorMessage={null}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Last Name */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-muted-foreground">
                                Last Name
                            </Text>
                            <Input
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Enter your last name"
                                leftIcon="User"
                                errorMessage={null}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Email (Read-only) */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-muted-foreground">
                                Email Address
                            </Text>
                            <View className="flex-row items-center h-[55px] px-4 gap-3 rounded-2xl border border-muted bg-muted/30">
                                <Icon name="Mail" size={18} color="#666" />
                                <Text className="flex-1 text-lg text-foreground">
                                    {user.email}
                                </Text>
                                <Icon name="Lock" size={18} color="#666" />
                            </View>
                            <Text className="mt-1 text-xs text-muted-foreground">
                                Email cannot be changed
                            </Text>
                        </View>
                    </View>

                    {/* Save Button */}
                    <View className="mt-8">
                        <Button
                            label="Save Changes"
                            onPress={handleSave}
                            loading={isSaving}
                            disabled={!hasChanges}
                            icon="Check"
                        />
                    </View>

                    {/* Account Info */}
                    <View className="items-center mt-8">
                        <Text className="text-xs text-muted-foreground">
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
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
