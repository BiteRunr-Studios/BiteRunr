// components/PageWithHeader.tsx
import React from "react";
import { View } from "react-native";
import { HeaderBar } from "./header-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export function PageWithHeader({ logoSource, onLogoPress, onBellPress, children }: any) {
    return (
        <View className="flex-1">
            <SafeAreaView edges={["top"]}>
                <HeaderBar
                    logoSource={logoSource}
                    onLogoPress={onLogoPress}
                    onBellPress={onBellPress}
                />
            </SafeAreaView>
            <View className="flex-1">{children}</View>
        </View>
    );
}
