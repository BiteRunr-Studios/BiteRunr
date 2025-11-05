import React from "react";
import {Alert, ScrollView, Text, View} from "react-native";
import {PageWithHeader} from "@/components/page-with-header";

export default function HomeTab() {
    return (
        <PageWithHeader
            title="Account"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}
        >
            <ScrollView className="flex-1 p-6">
                <View className="py-2">
                    <Text className="text-3xl font-bold text-foreground mb-2">Home</Text>
                    <Text className="text-2xl text-muted-foreground">
                        Explore the first section of your app
                    </Text>
                </View>
            </ScrollView>
        </PageWithHeader>
    );
}
