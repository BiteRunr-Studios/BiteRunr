import { View, Text } from "react-native";
import { Image } from "expo-image";

interface AvatarProps {
    name: string;
    avatarUrl?: string | null;
    size?: number;
}

export function Avatar({ name, avatarUrl, size = 52 }: AvatarProps) {
    if (avatarUrl) {
        return (
            <Image
                source={{ uri: avatarUrl }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={{ duration: 200 }}
                placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
            />
        );
    }

    const initials = name
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
            }}
            className="items-center justify-center bg-muted">
            <Text
                className="font-semibold text-muted-foreground"
                style={{ fontSize: size * 0.35 }}>
                {initials || "U"}
            </Text>
        </View>
    );
}
