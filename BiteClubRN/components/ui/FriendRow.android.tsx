import React, { useState } from "react";
import { View, Text, Image, ViewStyle, TouchableOpacity, Modal, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
  const [menuVisible, setMenuVisible] = useState(false);

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
      <TouchableOpacity onPress={() => setMenuVisible(true)}>
        <MaterialIcons name="more-vert" size={24} color={textColor} />
      </TouchableOpacity>
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable className="flex-1" onPress={() => setMenuVisible(false)}>
          <View className="absolute right-4 top-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 min-w-[150px]">
            <Pressable className="py-2 px-4" onPress={() => { setMenuVisible(false); /* TODO: Remove Friend */ }}>
              <Text className="text-red-500">Remove Friend</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default FriendRow; 