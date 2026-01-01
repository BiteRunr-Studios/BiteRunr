import { UserProfileType } from "@/lib/types";
import { Pressable, View, Text } from "react-native";
import Avatar from "./avatar";

type ProfileHeaderProps = {
    onPress: () => void;
    avatarSize?: number;
    user: UserProfileType | null;
    ctaLabel?: string;
};

export default function ProfileHeader({
    onPress,
    avatarSize = 55,
    user,
    ctaLabel = "Edit",
}: ProfileHeaderProps) {
    return (
        <Pressable
            onPress={onPress}
            className="bg-[#FDFDFD] dark:bg-[#020202] border border-primary/30 px-4 py-5 rounded-2xl flex-row items-center justify-between gap-2 mb-5"
        >
            <View className="flex-1 flex-row items-center justify-center gap-2">
                <Avatar size={avatarSize} />
                <View className="flex-1 gap-1">
                    <Text
                        className="text-xl leading-none text-foreground font-semibold"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {user?.profile?.first_name} {user?.profile?.last_name}
                    </Text>
                    <Text
                        className="leading-none text-muted-foreground/60"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {user?.email}
                    </Text>
                </View>
            </View>

            <View className="flex-row rounded-xl bg-primary/30 items-center justify-center px-4 py-2">
                <Text className="text-primary font-bold">{ctaLabel}</Text>
            </View>
        </Pressable>
    );
}
