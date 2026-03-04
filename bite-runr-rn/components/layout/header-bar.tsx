import React, { useState } from "react";
import { View, Image, Pressable } from "react-native";
import { TabBarIcon } from "@/components/layout/tabbar-icon";
import { router } from "expo-router";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { EnterCodeModal } from "@/components/enter-code-modal";

export function HeaderBar() {
    const [showScanner, setShowScanner] = useState(false);
    const [showEnterCode, setShowEnterCode] = useState(false);

    const handleScan = (code: string) => {
        setShowScanner(false);
        router.push(`/join/${code}`);
    };

    const handleEnterCode = () => {
        setShowScanner(false);
        // Small delay to let the scanner modal close before opening the code modal
        setTimeout(() => setShowEnterCode(true), 300);
    };

    const handleCodeSubmit = (code: string) => {
        setShowEnterCode(false);
        router.push(`/join/${code}`);
    };

    return (
        <View className="bg-background">
            <View className="flex-row items-center justify-between px-4 py-2 min-h-20">
                <Pressable
                    onPress={() => router.dismissTo("/")}
                    className="flex-row items-center">
                    <Image
                        source={require("@/assets/images/app-logo.png")}
                        style={{ width: 80, height: 80 }}
                        resizeMode="contain"
                    />
                </Pressable>

                <Pressable
                    onPress={() => setShowScanner(true)}
                    className="px-3 py-2 rounded-lg active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Scan QR code">
                    <TabBarIcon name="ScanLine" color="hsl(215.4 16.3% 46.9%)" />
                </Pressable>
            </View>

            <QRScannerModal
                visible={showScanner}
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
                onEnterCode={handleEnterCode}
            />

            <EnterCodeModal
                visible={showEnterCode}
                onSubmit={handleCodeSubmit}
                onClose={() => setShowEnterCode(false)}
            />
        </View>
    );
}
