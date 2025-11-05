import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Container } from "@/components/container";

export default function GroupsTab() {
    return (
        <Container>
            <ScrollView className="flex-1 p-6">
                <View className="py-8">
                    <Text className="text-3xl font-bold text-foreground mb-2">Groups</Text>
                    <Text className="text-2xl text-muted-foreground">
                        Discover your groups
                    </Text>
                </View>
            </ScrollView>
        </Container>
    );
}
