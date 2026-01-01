import React from "react";
import { ScrollView, Text, View } from "react-native";

export default function GroupsTab() {
    return (
        <ScrollView className="p-4">
            <View className="py-2">
                <Text className="text-3xl font-bold text-foreground mb-2">
                    Groups
                </Text>
                <Text className="text-2xl text-muted-foreground">
                    Discover your groups
                </Text>
            </View>
        </ScrollView>
    );
}
