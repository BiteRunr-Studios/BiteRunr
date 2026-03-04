import React, { useState, useEffect, useRef } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Icon from "@/components/common/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";

type QRScannerModalProps = {
    visible: boolean;
    onScan: (code: string) => void;
    onClose: () => void;
    onEnterCode: () => void;
};

export function QRScannerModal({
    visible,
    onScan,
    onClose,
    onEnterCode,
}: QRScannerModalProps) {
    const { colorScheme } = useColorScheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [hasScanned, setHasScanned] = useState(false);
    const scannedRef = useRef(false);

    // Reset scanned state when modal opens
    useEffect(() => {
        if (visible) {
            setHasScanned(false);
            scannedRef.current = false;
        }
    }, [visible]);

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        // Use ref for synchronous guard to prevent race condition
        if (scannedRef.current) return;

        // Parse the deep link format: biterunr://join/CODE
        const match = data.match(/biterunr:\/\/join\/([A-Z0-9]+)/i);
        if (match) {
            scannedRef.current = true;
            setHasScanned(true);
            onScan(match[1].toUpperCase());
        }
    };

    if (!permission) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            statusBarTranslucent
            onRequestClose={onClose}>
            <View className="flex-1 bg-black">
                {/* Header */}
                <View className="absolute top-0 left-0 right-0 z-10 pt-14 pb-4 px-4 bg-black/60">
                    <View className="flex-row items-center justify-between">
                        <Pressable
                            onPress={onClose}
                            className="p-2 rounded-full bg-white/20 active:opacity-70">
                            <Icon name="X" size={24} color="white" />
                        </Pressable>
                        <Text className="text-lg font-semibold text-white">
                            Scan QR Code
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                </View>

                {!permission.granted ? (
                    // Permission not granted view
                    <View className="flex-1 items-center justify-center px-8">
                        <View className="w-20 h-20 rounded-full bg-white/10 items-center justify-center mb-6">
                            <Icon name="Camera" size={40} color="white" />
                        </View>
                        <Text className="text-xl font-bold text-white text-center mb-3">
                            Camera Access Required
                        </Text>
                        <Text className="text-base text-white/70 text-center mb-6">
                            We need camera access to scan QR codes for joining
                            group orders.
                        </Text>
                        <Pressable
                            onPress={requestPermission}
                            className="px-8 py-4 rounded-xl bg-primary active:opacity-80">
                            <Text className="text-white font-semibold text-base">
                                Grant Permission
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onClose}
                            className="mt-4 px-8 py-4 active:opacity-80">
                            <Text className="text-white/70 font-medium text-base">
                                Cancel
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    // Camera view
                    <>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                            onBarcodeScanned={
                                hasScanned ? undefined : handleBarcodeScanned
                            }
                        />

                        {/* Scanning overlay */}
                        <View className="flex-1 items-center justify-center">
                            {/* Darkened corners - top */}
                            <View className="absolute top-0 left-0 right-0 h-1/4 bg-black/50" />
                            {/* Darkened corners - bottom */}
                            <View className="absolute bottom-0 left-0 right-0 h-1/4 bg-black/50" />
                            {/* Darkened corners - left */}
                            <View className="absolute top-1/4 bottom-1/4 left-0 w-12 bg-black/50" />
                            {/* Darkened corners - right */}
                            <View className="absolute top-1/4 bottom-1/4 right-0 w-12 bg-black/50" />

                            {/* Scanning frame */}
                            <View className="w-64 h-64 relative">
                                {/* Corner brackets */}
                                <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                                <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                            </View>
                        </View>

                        {/* Bottom instructions */}
                        <View className="absolute bottom-0 left-0 right-0 pb-12 pt-6 px-6 bg-black/60">
                            <Text className="text-white text-center text-base">
                                Point your camera at a BiteRunr QR code
                            </Text>
                            <Text className="text-white/60 text-center text-sm mt-2">
                                The code will be scanned automatically
                            </Text>
                            <Pressable
                                onPress={onEnterCode}
                                className="mt-4 py-3 rounded-xl bg-white/15 active:opacity-80">
                                <Text className="text-white text-center text-sm font-medium">
                                    Enter code manually
                                </Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}
