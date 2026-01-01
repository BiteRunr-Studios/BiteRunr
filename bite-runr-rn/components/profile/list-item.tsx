import React from "react";
import { Pressable, View, Text } from "react-native";
import Icon, { IconName } from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

type ListItemProps = {
    iconName: IconName;
    title: string;
    subtitle: string;
    onPress?: () => void;
    id?: string;
};

export const ListItem: React.FC<ListItemProps> = ({
    iconName,
    title,
    subtitle,
    onPress,
    id,
}) => {
    const { colorScheme } = useColorScheme();
    return (
        <Pressable
            id={id}
            className="flex-row items-center justify-between py-5 px-4"
            onPress={onPress}
        >
            <View className="flex-1 flex-row items-center gap-3 justify-center">
                <View className="w-10 h-10 rounded-xl bg-primary/30 items-center justify-center">
                    <Icon
                        name={iconName}
                        size={20}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </View>
                <View className="flex-1 items-start justify-center gap-1">
                    <Text
                        className="leading-none text-foreground text-lg font-semibold"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {title}
                    </Text>
                    <Text
                        className="leading-none text-muted-foreground/60"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {subtitle}
                    </Text>
                </View>
            </View>
            <View className="flex-0 bg-muted rounded-full p-0.5">
                <Icon
                    name="ChevronRight"
                    size={16}
                    color={NAV_THEME[colorScheme].mutedForeground}
                />
            </View>
        </Pressable>
    );
};
