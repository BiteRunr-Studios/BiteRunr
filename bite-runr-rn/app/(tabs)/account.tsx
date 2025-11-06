// app/(tabs)/account.tsx
import React from "react";
import { ScrollView, Text, View, Alert, Pressable, ActivityIndicator, Image } from "react-native";
import { PageWithHeader } from "@/components/page-with-header";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";

type ApiUserResponse = {
    id: string;
    email: string;
    profile: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
    } | null;
};

export default function AccountTab() {
    const [loading, setLoading] = React.useState(true);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [user, setUser] = React.useState<ApiUserResponse | null>(null);

    React.useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                setLoading(true);
                setErrorMsg(null);

                const { data: userData, error: userErr } = await supabase.auth.getUser();
                if (userErr) throw userErr;
                const authUser = userData.user;
                if (!authUser) {
                    if (!mounted) return;
                    setUser(null);
                    setLoading(false);
                    return;
                }

                const url = `https://biterunrapi-4bmpv.kinsta.app/users/${encodeURIComponent(authUser.id)}`;
                const res = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                    },
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`API ${res.status}: ${text}`);
                }

                const json: ApiUserResponse = await res.json();

                if (mounted) {
                    setUser(json);
                }
            } catch (e: any) {
                if (mounted) {
                    setErrorMsg(e?.message ?? "Failed to load user profile.");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        const { data: sub } = supabase.auth.onAuthStateChange((_event) => {
            load();
        });

        return () => {
            mounted = false;
            sub.subscription?.unsubscribe();
        };
    }, []);

    async function onSignOut() {
        try {
            supabase.auth.stopAutoRefresh();
            const { error } = await supabase.auth.signOut();
            if (error) {
                Alert.alert("Sign out failed", error.message);
                return;
            }
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Something went wrong.");
        } finally {
        }
    }

    const fullName =
        user?.profile
            ? [user.profile.first_name, user.profile.last_name].filter(Boolean).join(" ")
            : null;

    return (
        <PageWithHeader
            title="Account"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}
        >
            <ScrollView className="flex-1 p-6" keyboardShouldPersistTaps="handled">
                <View className="py-2">
                    <Text className="text-3xl font-bold text-foreground mb-2">Account</Text>
                    <Text className="text-2xl text-muted-foreground mb-6">Discover your account</Text>

                    {loading && (
                        <View className="flex-row items-center">
                            <ActivityIndicator />
                            <Text className="ml-2 text-muted-foreground">Loading profile…</Text>
                        </View>
                    )}

                    {!loading && errorMsg && (
                        <View className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
                            <Text className="text-destructive">{errorMsg}</Text>
                        </View>
                    )}

                    {!loading && !errorMsg && user && (
                        <>
                            <View className="flex-row items-center mb-6">
                                {user.profile?.avatar_url ? (
                                    <Image
                                        source={{ uri: user.profile.avatar_url }}
                                        className="w-16 h-16 rounded-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View className="w-16 h-16 rounded-full bg-muted items-center justify-center">
                                        <Text className="text-muted-foreground font-semibold">
                                            {(fullName || user.email || "U").slice(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View className="ml-4">
                                    <Text className="text-lg font-semibold text-foreground">
                                        {fullName || "Unknown User"}
                                    </Text>
                                    <Text className="text-muted-foreground">{user.email}</Text>
                                </View>
                            </View>

                            {/* Details */}
                            <View className="space-y-3 mb-6">
                                <View className="flex-row">
                                    <Text className="w-32 text-muted-foreground">First name</Text>
                                    <Text className="text-foreground">
                                        {user.profile?.first_name || "—"}
                                    </Text>
                                </View>
                                <View className="flex-row">
                                    <Text className="w-32 text-muted-foreground">Last name</Text>
                                    <Text className="text-foreground">
                                        {user.profile?.last_name || "—"}
                                    </Text>
                                </View>
                                <View className="flex-row">
                                    <Text className="w-32 text-muted-foreground">Created</Text>
                                    <Text className="text-foreground">
                                        {user.profile?.created_at
                                            ? new Date(user.profile.created_at).toLocaleString()
                                            : "—"}
                                    </Text>
                                </View>
                                <View className="flex-row">
                                    <Text className="w-32 text-muted-foreground">Updated</Text>
                                    <Text className="text-foreground">
                                        {user.profile?.updated_at
                                            ? new Date(user.profile.updated_at).toLocaleString()
                                            : "—"}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    {!loading && !errorMsg && !user && (
                        <View className="p-3 rounded-lg bg-muted">
                            <Text className="text-foreground">
                                You’re not signed in. Please sign in to see your profile.
                            </Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View className="mt-2">
                        <Pressable
                            onPress={onSignOut}
                            className="rounded-lg px-4 py-3 border border-destructive active:opacity-80"
                        >
                            <Text className="text-destructive font-semibold text-center">
                                Sign out
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </PageWithHeader>
    );
}
