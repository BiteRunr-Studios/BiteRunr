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
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as ImagePicker from "expo-image-picker";
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrAvatar, BrInput, BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
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

  const performDeleteAccount = async () => {
    if (deleteEligibility && !deleteEligibility.allowed) {
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
    if (deleteEligibility && !deleteEligibility.allowed) {
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BR.paper }}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText weight="bold" style={{ fontSize: 17 }}>
          Edit profile
        </BrText>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={BR.orange} />
        </View>
      ) : !user ? (
        <View style={styles.emptyState}>
          <BrText variant="h3">Not signed in</BrText>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar hero */}
            <Animated.View
              entering={FadeInUp.duration(300)}
              style={styles.avatarHero}
            >
              <Pressable
                onPress={showAvatarOptions}
                disabled={isUploadingAvatar}
                style={{ alignItems: "center" }}
              >
                <View style={{ position: "relative" }}>
                  <BrAvatar
                    name={fullName}
                    avatarUrl={user.avatarUrl}
                    size={100}
                    ring="#fff"
                  />
                  <View style={styles.cameraBadge}>
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon name="Camera" size={16} color="#fff" />
                    )}
                  </View>
                </View>
                <Text style={styles.avatarHint}>Tap to change photo</Text>
              </Pressable>
            </Animated.View>

            {/* Name fields */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(30)}
              style={{ gap: 10 }}
            >
              <BrText variant="eyebrow" style={{ marginBottom: 2 }}>
                Name
              </BrText>
              <BrInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                leftIcon="User"
                autoCapitalize="words"
                returnKeyType="next"
              />
              <BrInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                leftIcon="User"
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </Animated.View>

            {/* Email (locked) */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(25)}
              style={{ marginTop: 20 }}
            >
              <BrText variant="eyebrow" style={{ marginBottom: 8 }}>
                Email
              </BrText>
              <View style={styles.emailRow}>
                <Icon name="Mail" size={18} color={BR.ink2} />
                <Text style={styles.emailText} numberOfLines={1}>
                  {user.email}
                </Text>
                <View style={styles.lockedChip}>
                  <Icon name="Lock" size={10} color={BR.ink3} />
                  <Text style={styles.lockedText}>Locked</Text>
                </View>
              </View>
            </Animated.View>

            {/* Member since */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(65)}
              style={styles.memberRow}
            >
              <Icon name="Calendar" size={13} color={BR.ink3} />
              <Text style={styles.memberText}>
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
              style={{ marginTop: 28 }}
            >
              <Pressable
                onPress={handleSave}
                disabled={!hasChanges}
                className="flex-row gap-2 justify-center items-center p-4 w-full rounded-2xl border h-[55px] border-muted active:opacity-80 disabled:opacity-50"
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={BR.ink} />
                ) : (
                  <Icon name="Check" color={BR.ink} size={22} />
                )}
                <Text
                  className="text-lg font-semibold"
                  style={{ color: BR.ink }}
                >
                  Save changes
                </Text>
              </Pressable>
            </Animated.View>

            {/* Danger zone */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(80)}
              style={styles.dangerZone}
            >
              <BrText
                variant="eyebrow"
                style={{ color: BR.coralInk, marginBottom: 14 }}
              >
                Danger zone
              </BrText>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={isDeleting}
                style={[styles.deleteBtn, isDeleting && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel="Delete account"
                className="rounded-2xl"
              >
                <View style={styles.deleteBtnInner}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={BR.coralInk} />
                  ) : (
                    <Icon name="Trash2" size={18} color={BR.coralInk} />
                  )}
                  <Text style={styles.deleteBtnText}>Delete account</Text>
                </View>
              </Pressable>
              <Text style={styles.dangerCopy}>
                This permanently removes your profile, runs, and squad history.
                It can't be undone.
              </Text>
              {deleteEligibility && !deleteEligibility.allowed ? (
                <Text style={styles.dangerBlocked}>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 48,
  },
  avatarHero: {
    backgroundColor: BR.orangeTint,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,106,31,0.18)",
    padding: 28,
    alignItems: "center",
    marginBottom: 24,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: BR.orange,
    borderWidth: 2.5,
    borderColor: BR.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    fontSize: 12,
    color: BR.orangeDeep,
    fontFamily: BR_FONT.mono,
    marginTop: 12,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line2,
    backgroundColor: BR.paper2,
  },
  emailText: {
    flex: 1,
    fontSize: 16,
    color: BR.ink2,
  },
  lockedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: BR.line,
  },
  lockedText: {
    fontSize: 11,
    color: BR.ink3,
    fontWeight: "600",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: 20,
  },
  memberText: {
    fontSize: 13,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerZone: {
    marginTop: 36,
  },
  dangerCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: BR.ink3,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 12,
  },
  dangerBlocked: {
    fontSize: 13,
    lineHeight: 18,
    color: BR.coralInk,
    fontFamily: BR_FONT.mono,
    textAlign: "center",
    marginTop: 10,
  },
  deleteBtn: {
    height: 56,
    backgroundColor: BR.coralSoft,
    overflow: "hidden",
  },
  deleteBtnInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: BR.coralInk,
    marginLeft: 10,
  },
});
