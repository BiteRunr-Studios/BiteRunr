import React from 'react'
import {Alert, Text, View} from "react-native";
import {PageWithHeader} from "@/components/page-with-header";

const About = () => {
    return (
        <PageWithHeader
            title="Account"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}
        >
            <View className="flex-1 p-3">
                <Text className="text-2xl text-foreground">About:</Text>


            </View>
        </PageWithHeader>
    )
}
export default About
