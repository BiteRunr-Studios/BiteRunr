import React from 'react'
import {View, Text, ScrollView} from "react-native";
import {Container} from "@/components/container";

export default function AccountTab() {
    return (
        <Container>
            <ScrollView className="flex-1 p-6">
                <View className="py-8">
                    <Text className="text-3xl font-bold text-foreground mb-2">Account</Text>
                    <Text className="text-2xl text-muted-foreground">
                        Discover your account
                    </Text>
                </View>
            </ScrollView>
        </Container>
    )
}
