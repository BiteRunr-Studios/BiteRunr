// components/OAuthButton.tsx
import React, {
    useCallback,
    useMemo,
    useState,
    useEffect,
    useRef,
} from "react";
import { Alert, Pressable, Text, Animated } from "react-native";
import { Flow } from "react-native-animated-spinkit";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { createSessionFromUrl, redirectTo } from "@/app/(auth)/oauth";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { TabBarIcon } from "@/components/layout/tabbar-icon";
import { findUserByEmail, createUserProfile } from "@/api/profile/profile";
import { splitName } from "@/lib/split-name";

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = "github" | "google";

type OAuthButtonProps = {
    provider: OAuthProvider;
    label?: string;
    disabled?: boolean;
    className?: string;
};

export const OAuthButton: React.FC<OAuthButtonProps> = ({
    provider,
    label,
    disabled,
    className,
}) => {
    const { colorScheme } = useColorScheme();
    const [loading, setLoading] = useState(false);

    const defaultLabel = useMemo(() => {
        switch (provider) {
            case "google":
                return "Continue with Google";
            case "github":
                return "Continue with GitHub";
            default:
                return "Continue";
        }
    }, [provider]);

    const spinnerWidth = useRef(new Animated.Value(0)).current;
    const spinnerOpacity = useRef(new Animated.Value(0)).current;

    const scopes = provider === "github" ? "read:user user:email" : "";
    const iconName = provider === "google" ? "logo-google" : "logo-github";

    const isDisabled = disabled || loading;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(spinnerWidth, {
                toValue: loading ? 30 : 0,
                duration: 100,
                useNativeDriver: false,
            }),
            Animated.timing(spinnerOpacity, {
                toValue: loading ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [loading]);

    const startOAuth = useCallback(async () => {
        if (isDisabled) return;
        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                    scopes,
                },
            });

            if (error) {
                const message = error.message ?? "Sign-in failed.";
                Alert.alert(`${provider} sign-in failed`, message);
                setLoading(false);
                return;
            }

            const res = await WebBrowser.openAuthSessionAsync(
                data?.url ?? "",
                redirectTo
            );

            if (res.type === "success" && res.url) {
                createSessionFromUrl(res.url);

                const { data: data } = await supabase.auth.getUser();

                const user = data.user;
                const existingUser = await findUserByEmail(user?.email!);

                if (existingUser && existingUser.profile) {
                    setLoading(false);
                    router.replace("/(tabs)");
                    return;
                }

                const { firstName, lastName } = splitName(
                    user?.user_metadata["full_name"] ??
                        user?.user_metadata["name"]
                );
                const userProfile = {
                    id: user?.id!,
                    first_name: firstName,
                    last_name: lastName,
                    avatar_url: user?.user_metadata["avatar_url"],
                };
                const result = await createUserProfile(userProfile);
                if (!result)
                    throw Error("An error occured while creating user profile");

                setLoading(false);
                router.replace("/(tabs)");
            }
        } catch (e: any) {
            const msg = e?.message ?? "Something went wrong.";
            Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    }, [provider, disabled, loading, scopes]);

    return (
        <Pressable
            onPress={startOAuth}
            disabled={isDisabled}
            className={
                className ??
                "w-full flex-row items-center justify-center gap-2 rounded-2xl p-4 border border-muted bg-background active:opacity-80"
            }
            accessibilityRole="button"
            accessibilityLabel={label ?? defaultLabel}
        >
            <Animated.View
                style={{
                    width: spinnerWidth,
                    opacity: spinnerOpacity,
                    overflow: "hidden",
                }}
            >
                {loading && (
                    <Flow color={NAV_THEME[colorScheme].text} size={22} />
                )}
            </Animated.View>

            <TabBarIcon name={iconName} color={NAV_THEME[colorScheme].text} />

            <Text className={"text-foreground font-semibold text-lg "}>
                {label ?? defaultLabel}
            </Text>
        </Pressable>
    );
};
