import { useState, useEffect, useRef } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Icon from "@/components/common/icon";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";

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
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#1A1410]">
        {/* Header */}
        <View className="absolute left-0 right-0 top-0 z-10 bg-[rgba(26,20,16,0.6)] px-[18px] pb-4 pt-14">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] active:opacity-70"
            >
              <Icon name="X" size={18} color="#fff" />
            </Pressable>
            <Text
              className="text-[17px] text-white"
              style={BR_FONT_STYLE.display}
            >
              Scan QR code
            </Text>
            <View className="w-9" />
          </View>
        </View>

        {!permission.granted ? (
          // Permission not granted view
          <View className="flex-1 items-center justify-center px-8">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-[rgba(255,106,31,0.16)]">
              <Icon name="Camera" size={36} color={BR.orange} />
            </View>
            <Text
              className="mb-3 text-center text-[22px] text-white"
              style={BR_FONT_STYLE.display}
            >
              Camera access needed
            </Text>
            <Text className="mb-7 text-center text-[13px] leading-[19px] text-[rgba(255,255,255,0.6)]">
              We use your camera to scan BiteRunr QR codes so you can join a
              run.
            </Text>
            <Pressable
              onPress={requestPermission}
              className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 active:opacity-80"
            >
              <Icon name="Camera" size={16} color="#fff" />
              <Text
                className="text-base text-white"
                style={BR_FONT_STYLE.display}
              >
                Allow camera
              </Text>
            </Pressable>
            <Pressable
              onPress={onEnterCode}
              className="mt-2.5 w-full items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.08)] py-4 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-white">
                Enter code manually
              </Text>
            </Pressable>
            <Pressable onPress={onClose} className="mt-4 px-8 py-3">
              <Text
                className="text-[13px] text-[rgba(255,255,255,0.5)]"
                style={BR_FONT_STYLE.mono}
              >
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
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />

            {/* Scanning overlay */}
            <View className="flex-1 items-center justify-center">
              {/* Darkened corners - top */}
              <View className="absolute left-0 right-0 top-0 h-1/4 bg-[rgba(26,20,16,0.55)]" />
              {/* Darkened corners - bottom */}
              <View className="absolute bottom-0 left-0 right-0 h-1/4 bg-[rgba(26,20,16,0.55)]" />
              {/* Darkened corners - left */}
              <View className="absolute bottom-1/4 left-0 top-1/4 w-12 bg-[rgba(26,20,16,0.55)]" />
              {/* Darkened corners - right */}
              <View className="absolute bottom-1/4 right-0 top-1/4 w-12 bg-[rgba(26,20,16,0.55)]" />

              {/* Scanning frame */}
              <View className="relative h-64 w-64">
                {/* Corner brackets */}
                <View className="absolute left-0 top-0 h-9 w-9 rounded-tl-[14px] border-l-4 border-t-4 border-[#FF6A1F]" />
                <View className="absolute right-0 top-0 h-9 w-9 rounded-tr-[14px] border-r-4 border-t-4 border-[#FF6A1F]" />
                <View className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-[14px] border-b-4 border-l-4 border-[#FF6A1F]" />
                <View className="absolute bottom-0 right-0 h-9 w-9 rounded-br-[14px] border-b-4 border-r-4 border-[#FF6A1F]" />
              </View>
            </View>

            {/* Bottom instructions */}
            <View className="absolute bottom-0 left-0 right-0 bg-[rgba(26,20,16,0.6)] px-6 pb-12 pt-6">
              <Text
                className="text-center text-base text-white"
                style={BR_FONT_STYLE.displaySemibold}
              >
                Point your camera at a BiteRunr QR code
              </Text>
              <Text
                className="mt-2 text-center text-[11px] tracking-[1.2px] text-[rgba(255,255,255,0.5)]"
                style={BR_FONT_STYLE.mono}
              >
                · SCANS AUTOMATICALLY ·
              </Text>
              <Pressable
                onPress={onEnterCode}
                className="mt-4 rounded-2xl bg-[rgba(255,255,255,0.12)] py-3.5 active:opacity-80"
              >
                <Text className="text-center text-sm font-semibold text-white">
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
