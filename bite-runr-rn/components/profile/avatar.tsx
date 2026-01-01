import { AuthContext } from "@/lib/supabase-auth-context";
import { useContext, useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import Skeleton from "@/components/common/skeleton";

type AvatarProps = {
    size?: number;
    color?: string;
};

export default function Avatar({ size = 24, color }: AvatarProps) {
    const { userProfile } = useContext(AuthContext);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const fadeAnimation = useRef(new Animated.Value(0)).current;

    useEffect(
        () =>
            setAvatarUrl(
                userProfile?.profile?.avatar_url! ??
                    `https://ui-avatars.com/api/?name=${
                        userProfile?.profile?.first_name
                    }+${userProfile?.profile?.last_name}&size=${size * 2}`
            ),
        [userProfile]
    );

    useEffect(() => {
        if (avatarUrl) {
            setTimeout(() => {
                Animated.timing(fadeAnimation, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }).start(() => setIsLoading(false));
            }, 50);
        }
    }, [avatarUrl, fadeAnimation]);

    const borderClass =
        color === "hsl(0 0% 50%)"
            ? "border-[1.75px] border-[#808080]"
            : color === "hsl(32 100% 50%)"
            ? "border-[1.75px] border-primary"
            : "";

    return (
        <View style={{ width: size, height: size }}>
            {/* Skeleton - fades out */}
            {isLoading && (
                <Animated.View
                    style={{
                        position: "absolute",
                        opacity: fadeAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                        }),
                    }}
                >
                    <Skeleton
                        className={`rounded-full ${borderClass}`}
                        width={size}
                        height={size}
                        radius={9999}
                    />
                </Animated.View>
            )}

            {/* Image - fades in */}
            {avatarUrl && (
                <Animated.Image
                    width={size}
                    height={size}
                    source={{ uri: avatarUrl }}
                    className={`rounded-full ${borderClass}`}
                    resizeMode="cover"
                    style={{
                        opacity: fadeAnimation,
                        width: size,
                        height: size,
                        borderRadius: 9999,
                    }}
                />
            )}
        </View>
    );
}
