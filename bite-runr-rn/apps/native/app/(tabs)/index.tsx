import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Container } from "@/components/container";

export default function HomeTab() {
    return (
        <Container>
            <ScrollView className="flex-1 p-6">
                <View className="py-8">
                    <Text className="text-3xl font-bold text-foreground mb-2">Home</Text>
                    <Text className="text-2xl text-muted-foreground">
                        Explore the first section of your app
                    </Text>
                </View>
            </ScrollView>
        </Container>
    );
}
