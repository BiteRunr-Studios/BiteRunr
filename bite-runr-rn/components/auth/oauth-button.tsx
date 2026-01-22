// components/OAuthButton.tsx
import React, {
    useCallback,
    useMemo,
    useState,
    useEffect,
    useRef,
    useContext,
} from "react";
import { Alert, Pressable, Text, Animated } from "react-native";
import { Flow } from "react-native-animated-spinkit";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";
import { AuthContext } from "@/lib/convex-auth-context";
import { Ionicons } from "@expo/vector-icons";

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
    const { signInWithOAuth } = useContext(AuthContext);
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
            await signInWithOAuth(provider);
            // Navigation is handled by auth state change in the protected layout
        } catch (e: any) {
            const msg = e?.message ?? "Something went wrong.";
            // Don't show alert for user cancellation
            if (!msg.includes("cancelled")) {
                Alert.alert("Error", msg);
            }
        } finally {
            setLoading(false);
        }
    }, [provider, disabled, loading, signInWithOAuth]);

    return (
        <Pressable
            onPress={startOAuth}
            disabled={isDisabled}
            className={
                className ??
                "w-full flex-row items-center h-[55px] justify-center gap-2 rounded-2xl p-4 border border-muted active:opacity-80"
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

            <Text className={"text-foreground font-semibold text-lg"}>
                {label ?? defaultLabel}
            </Text>
        </Pressable>
    );
};
