import { findUserByEmail } from "@/api/profile/profile";
import { AuthContext } from "@/lib/supabase-auth-context";
import { useContext, useEffect, useRef, useState } from "react";
import { Animated, Image, View } from "react-native";
import Skeleton from "@/components/common/skeleton";

type AvatarProps = {
    size?: number;
    color?: string;
};

export default function Avatar({ size = 22, color }: AvatarProps) {
    const { session } = useContext(AuthContext);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const fadeAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        async function getAvatarUrl() {
            const user = await findUserByEmail(session!.user!.email!);
            const url =
                user?.profile?.avatar_url ??
                `https://ui-avatars.com/api/?name=${user?.profile?.first_name}+${user?.profile?.last_name}`;
            setAvatarUrl(url);
        }

        getAvatarUrl();
    }, [session]);

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
            ? "border-2 border-[#808080]"
            : color === "hsl(32 100% 50%)"
            ? "border-2 border-primary"
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
                    style={{ opacity: fadeAnimation }}
                />
            )}
        </View>
    );
}
