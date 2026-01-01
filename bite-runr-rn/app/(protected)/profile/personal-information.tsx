import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import Avatar from "@/components/profile/avatar";
import { createFormHandlers, FormState } from "@/lib/auth-helpers";
import { NAV_THEME } from "@/lib/constants";
import { AuthContext } from "@/lib/supabase-auth-context";
import { Ionicons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import { Pressable, View, Text, ScrollView, Alert } from "react-native";
import { useColorScheme } from "@/lib/use-color-scheme";
import { UserIdentity } from "@supabase/supabase-js";
import { Button } from "@/components/common/button";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";

export default function PersonalInformationScreen() {
    const { colorScheme } = useColorScheme();
    const { userProfile, session } = useContext(AuthContext);
    const [editable, setEditable] = useState(false);

    const [hasChanged, setHasChanged] = useState(false);
    const [form, setForm] = useState<FormState>({
        firstName: {
            label: "First name",
            value: userProfile?.profile?.first_name!,
            error: null,
            touched: false,
        },
        lastName: {
            label: "Last name",
            value: userProfile?.profile?.last_name!,
            error: null,
            touched: false,
        },
        email: {
            label: "Email",
            value: userProfile?.email!,
            error: null,
            touched: false,
        },
        newPassword: {
            label: "New Password",
            value: "",
            error: null,
            touched: false,
        },
        confirmNewPassword: {
            label: "Confirm New Password",
            value: "",
            error: null,
            touched: false,
        },
    });

    const { onChange, onBlur } = createFormHandlers(
        form,
        setForm,
        setHasChanged
    );

    const PROVIDER_LOGOS = {
        google: "logo-google",
        github: "logo-github",
    } as const;

    const getProviderLogo = (identities: UserIdentity[]) => {
        const identity = identities.find((id) => id.provider in PROVIDER_LOGOS);

        return identity
            ? PROVIDER_LOGOS[identity.provider as keyof typeof PROVIDER_LOGOS]
            : "camera-outline";
    };

    const requestPermissions = async () => {
        // Request media library permissions (iOS/Android)
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
    };

    const pickImage = async () => {
        const ok = await requestPermissions();
        if (!ok) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                quality: 1, // full quality; consider lowering for smaller uploads
                allowsEditing: false,
                exif: false,
            });

            if (result.canceled) {
                return; // user cancelled
            }

            const asset = result.assets?.[0];
            const res = await fetch(asset.uri);
            const blob = await res.blob();

            const { error } = await supabase.storage
                .from("profile-images")
                .upload(`${userProfile?.id}/avatar.${asset.mimeType}`, blob, {
                    contentType: asset.type || "application/octet-stream",
                    upsert: true, // overwrite if same path exists
                });

            if (error) throw error;
        } catch (err) {
            console.error("pickImage error", err);
            Alert.alert("Error", "Failed to pick image.");
        }
    };

    useEffect(() => {
        const identities = session!.user.identities ?? [];

        setEditable(
            !identities.some((id) =>
                Object.keys(PROVIDER_LOGOS).includes(id.provider as any)
            )
        );
    }, [session]);

    return (
        <SafeAreaView
            className="flex-1 transition-all duration-200"
            edges={["bottom"]}
        >
            <ScrollView className="flex px-4">
                <Pressable
                    onPress={pickImage}
                    className="mx-auto relative mb-3"
                >
                    <Avatar size={140} />
                    <View className="overflow-hidden absolute bottom-0 right-0 bg-background flex items-center justify-center w-10 h-10 rounded-xl">
                        <View className="absolute inset-0 bg-primary/30" />
                        {editable ? (
                            <Icon
                                name="Camera"
                                size={20}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        ) : (
                            <Ionicons
                                size={20}
                                name={getProviderLogo(
                                    session!.user.identities!
                                )}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        )}
                    </View>
                </Pressable>

                <Text className="ml-1 text-foreground/50 my-3">
                    Profile Information
                </Text>
                <View className="mb-3">
                    <View className="flex-row items-top gap-2">
                        {/* First Name Field */}
                        <View className="flex-1">
                            <Input
                                editable={editable}
                                value={form.firstName!.value}
                                placeholder="First Name"
                                leftIcon="IdCard"
                                autoCapitalize="words"
                                returnKeyType="next"
                                errorMessage={form.firstName!.error}
                                onChangeText={(v) => onChange("firstName", v)}
                                onBlur={() => onBlur("firstName")}
                            />
                        </View>

                        {/* Last Name Field */}
                        <View className="flex-1">
                            <Input
                                editable={editable}
                                value={form.lastName!.value}
                                placeholder="Last Name"
                                leftIcon="IdCard"
                                autoCapitalize="words"
                                returnKeyType="next"
                                errorMessage={form.lastName!.error}
                                onChangeText={(v) => onChange("lastName", v)}
                                onBlur={() => onBlur("lastName")}
                            />
                        </View>
                    </View>

                    <View className="mt-2" />

                    {/* Email Field*/}
                    <Input
                        editable={editable}
                        value={form.email!.value}
                        placeholder="Email"
                        leftIcon="Mail"
                        autoCapitalize="none"
                        returnKeyType="next"
                        errorMessage={form.email!.error}
                        onChangeText={(v) => onChange("email", v)}
                        onBlur={() => onBlur("email")}
                    />
                </View>

                <Text className="ml-1 text-foreground/50 my-3">
                    Reset Password
                </Text>
                <View className="mb-80">
                    {/* Password Field*/}
                    <Input
                        editable={editable}
                        value={form.newPassword!.value}
                        placeholder={form.newPassword!.label}
                        leftIcon="Lock"
                        rightIcon={form.newPassword!.show ? "EyeClosed" : "Eye"}
                        onRightIconPress={() => {
                            setForm((prev) => ({
                                ...prev,
                                newPassword: {
                                    ...prev.newPassword!,
                                    show: !prev.newPassword!.show,
                                },
                            }));
                        }}
                        autoCapitalize="none"
                        returnKeyType="default"
                        errorMessage={form.newPassword!.error}
                        onChangeText={(v) => onChange("newPassword", v)}
                        onBlur={() => onBlur("newPassword")}
                        secureTextEntry={!form.newPassword!.show}
                    />

                    <View className="mt-2" />

                    <Input
                        editable={editable}
                        value={form.confirmNewPassword!.value}
                        placeholder={form.confirmNewPassword!.label}
                        leftIcon="Lock"
                        rightIcon={
                            form.confirmNewPassword!.show ? "EyeClosed" : "Eye"
                        }
                        onRightIconPress={() => {
                            setForm((prev) => ({
                                ...prev,
                                confirmNewPassword: {
                                    ...prev.confirmNewPassword!,
                                    show: !prev.confirmNewPassword!.show,
                                },
                            }));
                        }}
                        autoCapitalize="none"
                        returnKeyType="default"
                        errorMessage={form.confirmNewPassword!.error}
                        onChangeText={(v) => onChange("confirmNewPassword", v)}
                        onBlur={() => onBlur("confirmNewPassword")}
                        secureTextEntry={!form.confirmNewPassword!.show}
                    />
                </View>
            </ScrollView>
            <View className="px-4">
                <Button
                    disabled={!hasChanged}
                    onPress={() => console.log("Button Pressed")}
                    label="Save Changes"
                />
            </View>
        </SafeAreaView>
    );
}
