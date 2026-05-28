import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as ImagePicker from "expo-image-picker";
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrAvatar, BrInput, BrText } from "@/components/br";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { authClient } from "@/lib/auth-client";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function AccountInfoScreen() {
  const user = useQuery(api.users.getCurrentUser);
  const deleteEligibility = useQuery(api.accountDeletion.canDeleteAccount);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const removeAvatar = useMutation(api.users.removeAvatar);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

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
      Alert.alert("Saved", "Your profile has been updated.");
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
        "Please allow access to your photo library.",
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
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) throw new Error("Failed to upload image");
      const { storageId } = await uploadResponse.json();
      if (!storageId) throw new Error("Invalid upload response");
      await updateAvatar({ storageId: storageId as Id<"_storage"> });
      Alert.alert("Done", "Your photo has been updated.");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to upload photo");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    Alert.alert("Remove photo", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setIsUploadingAvatar(true);
          try {
            await removeAvatar();
          } catch (error: any) {
            Alert.alert("Error", error?.message ?? "Failed to remove photo");
          } finally {
            setIsUploadingAvatar(false);
          }
        },
      },
    ]);
  };

  const isDeleteEligibilityLoading = deleteEligibility === undefined;

  const performDeleteAccount = async () => {
    if (isDeleteEligibilityLoading) {
      return;
    }
    if (!deleteEligibility.allowed) {
      Alert.alert(
        "Cannot delete account",
        deleteEligibility.reason ?? "Your account cannot be deleted right now.",
      );
      return;
    }

    setIsDeleting(true);
    try {
      const result = await authClient.deleteUser();
      if (result.error) {
        const message = result.error.message ?? "Failed to delete account";
        if (
          message.toLowerCase().includes("session") ||
          message.toLowerCase().includes("expired")
        ) {
          Alert.alert(
            "Sign in required",
            "For security, sign out and sign back in, then try deleting your account again.",
          );
        } else {
          Alert.alert("Error", message);
        }
        return;
      }
      router.replace("/(auth)/sign-in");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete account";
      if (
        message.toLowerCase().includes("session") ||
        message.toLowerCase().includes("expired")
      ) {
        Alert.alert(
          "Sign in required",
          "For security, sign out and sign back in, then try deleting your account again.",
        );
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isDeleteEligibilityLoading) {
      return;
    }
    if (!deleteEligibility.allowed) {
      Alert.alert(
        "Cannot delete account",
        deleteEligibility.reason ?? "Your account cannot be deleted right now.",
      );
      return;
    }

    Alert.alert(
      "Delete account",
      "This permanently deletes your account and profile data. Orders you shared with others may keep history without your name. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: performDeleteAccount,
        },
      ],
    );
  };

  const showAvatarOptions = () => {
    const options = user?.avatarUrl
      ? [
          { text: "Change photo", onPress: pickImage },
          {
            text: "Remove photo",
            onPress: handleRemoveAvatar,
            style: "destructive" as const,
          },
          { text: "Cancel", style: "cancel" as const },
        ]
      : [
          { text: "Choose photo", onPress: pickImage },
          { text: "Cancel", style: "cancel" as const },
        ];
    Alert.alert("Profile photo", "What would you like to do?", options);
  };

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || user?.email || "U";
  const isLoading = user === undefined;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-[18px] pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText
          weight="bold"
          className="text-[17px]"
          style={BR_FONT_STYLE.display}
        >
          Edit profile
        </BrText>
        <View className="w-[38px]" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BR.orange} />
        </View>
      ) : !user ? (
        <View className="flex-1 items-center justify-center">
          <BrText variant="h3">Not signed in</BrText>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-[18px] pb-12"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar hero */}
            <Animated.View
              entering={FadeInUp.duration(300)}
              className="mb-6 items-center rounded-[22px] border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2] p-7"
            >
              <Pressable
                onPress={showAvatarOptions}
                disabled={isUploadingAvatar}
                className="items-center"
              >
                <View className="relative">
                  <BrAvatar
                    name={fullName}
                    avatarUrl={user.avatarUrl}
                    size={100}
                    ring="#fff"
                  />
                  <View className="absolute right-0 bottom-0 h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-[#FFF1E2] bg-[#FF6A1F]">
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon name="Camera" size={16} color="#fff" />
                    )}
                  </View>
                </View>
                <Text className="mt-3 font-['JetBrainsMono_500Medium'] text-xs text-[#E8551A]">
                  Tap to change photo
                </Text>
              </Pressable>
            </Animated.View>

            {/* Name fields */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(30)}
              className="gap-4"
            >
              <View>
                <BrText variant="eyebrow" className="mb-2">
                  First name
                </BrText>
                <BrInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  leftIcon="IdCard"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              <View>
                <BrText variant="eyebrow" className="mb-2">
                  Last name
                </BrText>
                <BrInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  leftIcon="IdCard"
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>
            </Animated.View>

            {/* Email (locked) */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(25)}
              className="mt-5"
            >
              <BrText variant="eyebrow" className="mb-2">
                Email
              </BrText>
              <View className="h-[54px] flex-row items-center gap-3 rounded-[16px] border border-[rgba(26,20,16,0.14)] bg-[#FCEFE0] px-4">
                <Icon name="Mail" size={18} color={BR.ink2} />
                <Text
                  className="flex-1 text-base text-[#4A3C32]"
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
                <View className="flex-row items-center gap-1 rounded-full bg-[rgba(26,20,16,0.08)] px-2 py-[3px]">
                  <Icon name="Lock" size={10} color={BR.ink3} />
                  <Text className="text-[11px] font-semibold text-[#8A7A6E]">
                    Locked
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Member since */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(65)}
              className="mt-5 flex-row items-center justify-center gap-1.5"
            >
              <Icon name="Calendar" size={13} color={BR.ink3} />
              <Text className="font-['JetBrainsMono_500Medium'] text-[13px] text-[#8A7A6E]">
                Member since{" "}
                {new Date(user._creationTime).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </Animated.View>

            {/* Save */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(40)}
              className="mt-7"
            >
              <Pressable
                onPress={handleSave}
                disabled={!hasChanges}
                className="h-[55px] w-full flex-row items-center justify-center gap-2 rounded-2xl border border-muted p-4 active:opacity-80 disabled:opacity-50"
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={BR.ink} />
                ) : (
                  <Icon name="Check" color={BR.ink} size={22} />
                )}
                <Text className="text-lg font-semibold text-[#1A1410]">
                  Save changes
                </Text>
              </Pressable>
            </Animated.View>

            {/* Danger zone */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(80)}
              className="mt-9"
            >
              <BrText variant="eyebrow" className="mb-3.5 text-[#B82340]">
                Danger zone
              </BrText>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={isDeleting || isDeleteEligibilityLoading}
                className="h-14 overflow-hidden rounded-2xl bg-[#FFE0E6] disabled:opacity-50"
                accessibilityRole="button"
                accessibilityLabel="Delete account"
              >
                <View className="flex-1 flex-row items-center justify-center">
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={BR.coralInk} />
                  ) : (
                    <Icon name="Trash2" size={18} color={BR.coralInk} />
                  )}
                  <Text className="ml-2.5 text-[17px] font-bold text-[#B82340]">
                    Delete account
                  </Text>
                </View>
              </Pressable>
              <Text className="mt-3.5 px-3 text-center text-[13px] leading-[18px] text-[#8A7A6E]">
                This permanently removes your profile, runs, and squad history.
                It can't be undone.
              </Text>
              {deleteEligibility && !deleteEligibility.allowed ? (
                <Text className="mt-2.5 text-center font-['JetBrainsMono_500Medium'] text-[13px] leading-[18px] text-[#B82340]">
                  {deleteEligibility.reason}
                </Text>
              ) : null}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
