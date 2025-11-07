import React from "react";
import { Pressable, View, Text} from "react-native";
import {Ionicons} from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

type ListItemProps = {
    iconName: IoniconName;
    iconColor?: string;
    title: string;
    subtitle: string;
    onPress?: () => void;
    testID?: string;
};

export const ListItem: React.FC<ListItemProps> = ({
                                                      iconName,
                                                      iconColor = "#FF8800",
                                                      title,
                                                      subtitle,
                                                      onPress,
                                                      testID,
                                                  }) => {
    return (
        <Pressable
            testID={testID}
            className="flex-row items-center justify-between rounded-2xl px-4 py-3 border border-black dark:border-gray-800"
            android_ripple={{ color: "#2a2a2d" }}
            onPress={onPress}
        >
            <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-[#402500] items-center justify-center mr-3">
                    <Ionicons name={iconName} size={20} color={iconColor} />
                </View>
                <View>
                    <Text className="text-foreground text-base font-semibold">{title}</Text>
                    <Text className="text-muted-foreground text-sm">{subtitle}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8e8e93" />
        </Pressable>
    );
};