import React from "react";
import { Pressable, View, Text } from "react-native";
import Icon, { IconName } from "../common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

type ListItemProps = {
    iconName: IconName;
    iconColor?: string;
    title: string;
    subtitle: string;
    onPress?: () => void;
    testID?: string;
};

export const ListItem: React.FC<ListItemProps> = ({
    iconName,
    iconColor,
    title,
    subtitle,
    onPress,
    testID,
}) => {
    const { colorScheme } = useColorScheme();
    const resolvedIconColor = iconColor ?? NAV_THEME[colorScheme].primary;
    return (
        <Pressable
            testID={testID}
            className="flex-row items-center justify-between px-4 py-3 border border-black rounded-xl dark:border-muted-foreground"
            android_ripple={{ color: "#2a2a2d" }}
            onPress={onPress}>
            <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-[#402500] items-center justify-center mr-3">
                    <Icon name={iconName} size={20} color={resolvedIconColor} />
                </View>
                <View>
                    <Text className="text-base font-semibold text-foreground">
                        {title}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                        {subtitle}
                    </Text>
                </View>
            </View>
            <Icon name="ChevronRight" size={18} color="#8e8e93" />
        </Pressable>
    );
};
