import { NAV_THEME } from "@/lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";

type OAuthBadgeProps = {
    providerLogos: string[];
    colorScheme: "light" | "dark";
};

export default function OAuthBadge({
    providerLogos,
    colorScheme,
}: OAuthBadgeProps) {
    return (
        <View className="flex-row justify-center items-center gap-1 bg-background py-1 px-2 rounded-full overflow-hidden">
            <View className="absolute inset-0 bg-primary/30" />
            {providerLogos.map((logo, index) => (
                <View key={index} className="flex-row items-center gap-1">
                    <Ionicons
                        size={20}
                        name={logo as any}
                        color={NAV_THEME[colorScheme].primary}
                    />
                    {index < providerLogos.length - 1 && (
                        <Text className="text-primary">+</Text>
                    )}
                </View>
            ))}
        </View>
    );
}
