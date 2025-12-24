// components/PageWithHeader.tsx
import React from "react";
import { HeaderBar } from "@/components/layout/header-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export function PageWithHeader({
    logoSource,
    onLogoPress,
    onBellPress,
    children,
}: any) {
    return (
        <SafeAreaView className="flex-1 px-4">
            <HeaderBar
                logoSource={logoSource}
                onLogoPress={onLogoPress}
                onBellPress={onBellPress}
            />
            {children}
        </SafeAreaView>
    );
}
