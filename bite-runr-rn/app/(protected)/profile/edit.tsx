import { Input } from "@/components/common/input";
import Avatar from "@/components/profile/avatar";
import { NAV_THEME } from "@/lib/constants";
import { AuthContext } from "@/lib/supabase-auth-context";
import { Ionicons } from "@expo/vector-icons";
import { useContext, useState } from "react";
import { Pressable, View, Text, ScrollView, Alert } from "react-native";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Button } from "@/components/common/button";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useForm } from "react-hook-form";
import { ProfileType } from "@/lib/types";
import { updateUserProfile } from "@/api/profile/profile";
import { router } from "expo-router";
import OAuthBadge from "@/components/auth/oauth-badge";
import { hasOAuthProvider, getProviderLogos } from "@/lib/auth-helpers";

type AvatarImage = {
    uri: string;
    mimeType: string;
    fileExt: string;
};

type PersonalInformationFormData = {
    firstName: string;
    lastName: string;
    email: string;
    avatarImage: AvatarImage | null;
};

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "avif"];
const STORAGE_BUCKET = "profile-images";
const MAX_IMAGE_SIZE_MB = 2;

export default function PersonalInformationScreen() {
    const { colorScheme } = useColorScheme();

    const { userProfile, session, refreshUserProfile, signOut } =
        useContext(AuthContext);

    const { control, handleSubmit, setValue, getValues, formState } =
        useForm<PersonalInformationFormData>({
            defaultValues: {
                firstName: userProfile!.profile!.first_name!,
                lastName: userProfile!.profile!.last_name!,
                email: userProfile?.email,
                avatarImage: null,
            },
        });
    const [loading, setLoading] = useState(false);

    async function onUpdateProfile(data: PersonalInformationFormData) {
        if (loading) return;

        try {
            setLoading(true);

            let avatarUrl = userProfile?.profile?.avatar_url || null;
            if (data.avatarImage) {
                const imagePublicUrl = await saveImage(
                    data.avatarImage,
                    STORAGE_BUCKET
                );

                if (!imagePublicUrl) throw new Error("Failed to save image");

                avatarUrl = imagePublicUrl;
            }

            const profile: ProfileType = {
                first_name: data.firstName,
                last_name: data.lastName,
                avatar_url: avatarUrl,
            };

            const result = await updateUserProfile(profile, userProfile!.id);
            if (!result) throw new Error("Failed to update profile");

            if (formState.dirtyFields.email) {
                const { error } = await supabase.auth.updateUser({
                    email: data.email,
                });

                if (error) throw error;
            }

            await refreshUserProfile();
            router.dismissTo("/(protected)/(tabs)/profile");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    }

    async function saveImage(
        avatarImage: AvatarImage,
        storageBucket: string
    ): Promise<string | null> {
        await deleteOldAvatars(userProfile!.id, storageBucket);

        const response = await fetch(avatarImage.uri);
        const arrayBuffer = await response.arrayBuffer();

        const timestamp = Date.now();
        const filePath = `${userProfile?.id}/avatar-${timestamp}.${avatarImage.fileExt}`;
        const { error } = await supabase.storage
            .from(storageBucket)
            .upload(filePath, arrayBuffer, {
                contentType: avatarImage.mimeType,
            });
        if (error) throw error;

        const { data: imageUrlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        return imageUrlData.publicUrl;
    }

    async function deleteOldAvatars(userId: string, storageBucket: string) {
        const { data: files, error: listError } = await supabase.storage
            .from(storageBucket)
            .list(userId, {
                search: "avatar-",
                sortBy: {
                    column: "created_at",
                    order: "asc",
                },
            });

        if (listError) throw listError;

        if (!files || files.length == 0) return;

        const filesToDelete = files.map((file) => `${userId}/${file.name}`);

        if (filesToDelete.length > 1) filesToDelete.pop();

        const { error: deleteError } = await supabase.storage
            .from(storageBucket)
            .remove(filesToDelete);

        if (deleteError) throw deleteError;
    }

    async function pickImage(): Promise<void> {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                quality: 1,
                allowsEditing: false,
                aspect: [1, 1],
                exif: false,
            });

            if (result.canceled) return;

            const asset = result.assets?.[0];

            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const fileSizeInMB = blob.size / (1024 * 1024);

            if (fileSizeInMB > MAX_IMAGE_SIZE_MB) {
                Alert.alert(
                    "Error",
                    `Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`
                );
                return;
            }

            const fileExt = asset.uri.split(".").pop()?.toLowerCase();

            if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
                Alert.alert(
                    "Error",
                    "Only JPG, PNG, WEBP, HEIC, and AVIF images are allowed"
                );
                return;
            }

            setValue(
                "avatarImage",
                {
                    uri: asset.uri,
                    mimeType: asset.mimeType || "image/jpeg",
                    fileExt: fileExt,
                },
                { shouldDirty: true, shouldValidate: true }
            );
        } catch (err) {
            console.error("pickImage error", err);
            Alert.alert("Error", "Failed to pick image.");
        }
    }

    async function requestPermissions(): Promise<boolean> {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission required",
                "We need media library permission to select images."
            );
            return false;
        }
        return true;
    }

    // Editable state according to user type (OAuth or email account)
    const editable = !hasOAuthProvider(session!.user.identities!);
    const providerLogos = getProviderLogos(session!.user.identities!);

    return (
        <SafeAreaView
            className="flex-1 transition-all duration-200"
            edges={["bottom"]}
        >
            <ScrollView className="flex px-4">
                <Pressable
                    onPress={editable ? pickImage : undefined}
                    className="mx-auto relative mb-3"
                >
                    <View className="border-4 border-primary/30 rounded-full p-1">
                        <Avatar
                            size={140}
                            previewUri={getValues("avatarImage.uri")}
                        />
                    </View>

                    {/* Bottom-centered overlay */}
                    <View className="absolute bottom-0 left-0 right-0 items-center justify-center">
                        {editable ? (
                            <View className="flex-row justify-center items-center gap-1 bg-background py-2 px-3 rounded-full overflow-hidden">
                                <View className="absolute inset-0 bg-primary/30" />
                                <Ionicons
                                    name="camera"
                                    size={18}
                                    color={NAV_THEME[colorScheme].primary}
                                />
                                <Text className="text-primary font-bold">
                                    Change
                                </Text>
                            </View>
                        ) : (
                            <OAuthBadge
                                colorScheme={colorScheme}
                                providerLogos={providerLogos}
                            />
                        )}
                    </View>
                </Pressable>

                <View className="mb-3">
                    <View className="flex-row items-top gap-2">
                        {/* First Name Field */}
                        <View className="flex-1">
                            <Input
                                name="firstName"
                                control={control}
                                editable={editable}
                                placeholder="First Name"
                                leftIcon="IdCard"
                                autoCapitalize="words"
                                returnKeyType="next"
                                rules={{ required: "First name is required" }}
                            />
                        </View>

                        {/* Last Name Field */}
                        <View className="flex-1">
                            <Input
                                name="lastName"
                                control={control}
                                editable={editable}
                                placeholder="Last Name"
                                leftIcon="IdCard"
                                autoCapitalize="words"
                                returnKeyType="next"
                                rules={{ required: "Last name is required" }}
                            />
                        </View>
                    </View>

                    <View className="mt-2" />

                    {/* Email Field*/}
                    <Input
                        name="email"
                        control={control}
                        editable={editable}
                        placeholder="Email"
                        leftIcon="Mail"
                        autoCapitalize="none"
                        returnKeyType="next"
                        rules={{
                            required: "Email is required",
                            pattern: {
                                value: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/,
                                message: "Email is invalid",
                            },
                        }}
                        helperText="You'll need to verify your new email address if you change it. We'll sign you out of all sessions and send a confirmation link to your new email."
                    />
                </View>
            </ScrollView>
            <View className="px-4">
                <Button
                    loading={loading}
                    disabled={!formState.isDirty}
                    onPress={handleSubmit(onUpdateProfile)}
                    label="Save Changes"
                />
            </View>
        </SafeAreaView>
    );
}
