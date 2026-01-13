import React from "react";
import { Pressable, View, Text } from "react-native";
import Icon, { IconName } from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

type ListItemProps = {
    iconName: IconName;
    title: string;
    onPress?: () => void;
    id?: string;
};

export const ListItem: React.FC<ListItemProps> = ({
    iconName,
    title,
    onPress,
    id,
}) => {
    const { colorScheme } = useColorScheme();
    return (
        <Pressable
            id={id}
            className="flex-row items-center justify-between py-5"
            onPress={onPress}
        >
            <View className="flex-1 flex-row items-center gap-3">
                <Icon
                    name={iconName}
                    size={20}
                    color={NAV_THEME[colorScheme].mutedForeground}
                />
                <Text
                    className="text-muted-foreground text-lg"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {title}
                </Text>
            </View>
            <Icon
                className="flex-0"
                name="ChevronRight"
                size={16}
                color={NAV_THEME[colorScheme].mutedForeground}
            />
        </Pressable>
    );
};
