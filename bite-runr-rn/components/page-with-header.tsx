// components/PageWithHeader.tsx
import React from "react";
import { View } from "react-native";
import { HeaderBar } from "./header-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export function PageWithHeader({ children }: any) {
    return (
        <View className="flex-1">
            <SafeAreaView edges={["top"]}>
                <HeaderBar />
            </SafeAreaView>
            <View className="flex-1">{children}</View>
        </View>
    );
}
