import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/common/input";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function PaymentSettingsScreen() {
    const user = useQuery(api.users.getCurrentUser);
    const updatePaypalMe = useMutation(api.users.updatePaypalMe);

    const { colorScheme } = useColorScheme();

    const [paypalMe, setPaypalMe] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isLoading = user === undefined;

    useEffect(() => {
        if (user) {
            setPaypalMe(user.paypalMe ?? "");
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            const changed = paypalMe.trim() !== (user.paypalMe ?? "");
            setHasChanges(changed);
        }
    }, [paypalMe, user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePaypalMe({
                paypalMe: paypalMe.trim() || undefined,
            });
            Alert.alert("Success", "Your PayPal settings have been updated");
            setHasChanges(false);
        } catch (error: any) {
            Alert.alert(
                "Error",
                error?.message ?? "Failed to update payment settings",
            );
        } finally {
            setIsSaving(false);
        }
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
                        Payment Settings
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
                    Payment Settings
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
                    {/* Info Banner */}
                    <View className="flex-row items-start gap-3 p-4 mb-6 rounded-xl bg-primary/10">
                        <Icon
                            name="Info"
                            size={20}
                            color={NAV_THEME[colorScheme].primary}
                        />
                        <Text className="flex-1 text-sm leading-5 text-foreground">
                            Set up your PayPal.me link so friends can easily pay
                            you when you pick up orders. Your handle will be
                            visible to order participants.
                        </Text>
                    </View>

                    {/* PayPal.me Handle */}
                    <View className="p-4 border rounded-xl border-muted bg-card">
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                                <Icon
                                    name="Wallet"
                                    size={16}
                                    color="#3b82f6"
                                />
                            </View>
                            <Text className="text-sm font-medium text-muted-foreground">
                                PayPal.me Username
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <Text className="text-base text-muted-foreground">
                                paypal.me/
                            </Text>
                            <View className="flex-1">
                                <Input
                                    value={paypalMe}
                                    onChangeText={setPaypalMe}
                                    placeholder="your-username"
                                    errorMessage={null}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={`flex-row items-center justify-center gap-2 py-4 mt-6 rounded-xl ${
                            !hasChanges || isSaving
                                ? "bg-muted opacity-60"
                                : "bg-primary"
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
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
