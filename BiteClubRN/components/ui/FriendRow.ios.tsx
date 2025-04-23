import React from "react";
import { View, Text, Image, ViewStyle, TouchableOpacity, ActionSheetIOS } from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";

interface FriendRowProps {
  friend: {
    id: string;
    first_name: string;
    last_name: string;
    image_url?: string;
    email: string;
  };
  textColor?: string;
  style?: ViewStyle;
}

const FriendRow: React.FC<FriendRowProps> = ({ friend, textColor = "#000", style }) => {
  const showActionSheet = () => {
    ActionSheetIOS.showActionSheetWithOptions({
      options: ["Cancel", "Remove Friend"],
      destructiveButtonIndex: 1,
      cancelButtonIndex: 0,
    }, (buttonIndex) => {
      if (buttonIndex === 1) {
        // TODO: Remove Friend
      }
    });
  };

  return (
    <View className="flex-row items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-transparent" style={style}>
      <Image
        source={{ uri: friend.image_url || undefined }}
        className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700"
        resizeMode="cover"
      />
      <Text style={{ color: textColor }} className="text-lg font-medium flex-1">
        {friend.first_name} {friend.last_name}
      </Text>
      <TouchableOpacity onPress={showActionSheet}>
        <IconSymbol name="ellipsis" size={24} color={textColor} />
      </TouchableOpacity>
    </View>
  );
};

export default FriendRow; 