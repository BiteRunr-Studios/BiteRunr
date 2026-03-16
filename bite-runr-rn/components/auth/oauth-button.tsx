import React, {
    useMemo,
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { Pressable, Text, Animated, Alert } from "react-native";
import { Flow } from "react-native-animated-spinkit";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { authClient } from "@/lib/auth-client";

type OAuthProvider = "github" | "google" | "apple";

type OAuthButtonProps = {
    provider: OAuthProvider;
    label?: string;
    disabled?: boolean;
    className?: string;
    // Note: No onSuccess callback because signIn.social() opens a browser and returns
    // immediately. Actual OAuth completion happens via deep link callback, so consumers
    // should use auth context/state changes to react to successful authentication.
    onError?: (error: Error) => void;
};

export const OAuthButton: React.FC<OAuthButtonProps> = ({
    provider,
    label,
    disabled,
    className,
    onError,
}) => {
    const { colorScheme } = useColorScheme();
    const [loading, setLoading] = useState(false);

    const defaultLabel = useMemo(() => {
        switch (provider) {
            case "google":
                return "Continue with Google";
            case "github":
                return "Continue with GitHub";
            case "apple":
                return "Continue with Apple";
            default:
                return "Continue";
        }
    }, [provider]);

    const spinnerWidth = useRef(new Animated.Value(0)).current;
    const spinnerOpacity = useRef(new Animated.Value(0)).current;

    const iconName =
        provider === "google"
            ? "logo-google"
            : provider === "apple"
              ? "logo-apple"
              : "logo-github";

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
    }, [loading, spinnerWidth, spinnerOpacity]);

    const handleOAuthPress = useCallback(async () => {
        if (isDisabled) return;

        setLoading(true);
        try {
            // signIn.social() opens browser and returns immediately
            // The actual auth completion happens via deep link callback
            // User sync will be handled by the protected layout
            await authClient.signIn.social({
                provider,
                callbackURL: "/(protected)/(tabs)",
            });
            // Note: Code here runs BEFORE OAuth completes in the browser
            // The session and user sync are handled when the app receives the callback
        } catch (error) {
            console.error(`${provider} OAuth error:`, error);
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
            const providerName =
                provider === "google"
                    ? "Google"
                    : provider === "apple"
                      ? "Apple"
                      : "GitHub";
            Alert.alert(
                "Sign In Failed",
                `Unable to sign in with ${providerName}. Please try again.`,
            );
        } finally {
            setLoading(false);
        }
    }, [isDisabled, provider, onError]);

    return (
        <Pressable
            onPress={handleOAuthPress}
            disabled={isDisabled}
            className={
                className ??
                "flex-row gap-2 justify-center items-center p-4 w-full rounded-2xl border h-[55px] border-muted active:opacity-80"
            }
            accessibilityRole="button"
            accessibilityLabel={label ?? defaultLabel}>
            <Animated.View
                style={{
                    width: spinnerWidth,
                    opacity: spinnerOpacity,
                    overflow: "hidden",
                }}>
                {loading && (
                    <Flow color={NAV_THEME[colorScheme].text} size={22} />
                )}
            </Animated.View>

            <Ionicons
                name={iconName}
                color={NAV_THEME[colorScheme].text}
                size={24}
            />

            <Text className={"text-lg font-semibold text-foreground"}>
                {label ?? defaultLabel}
            </Text>
        </Pressable>
    );
};
