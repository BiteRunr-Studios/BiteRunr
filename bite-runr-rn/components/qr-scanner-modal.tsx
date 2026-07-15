import { useState, useEffect, useRef } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Icon from "@/components/common/icon";
import { BrText } from "@/components/br";
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
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="absolute top-0 left-0 right-0 z-10 pt-14 pb-4 px-[18px] bg-black/60">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#FCEFE0] active:opacity-70"
            >
              <Icon name="X" size={20} color={BR.ink} />
            </Pressable>
            <BrText
              weight="bold"
              color="#fff"
              className="text-[17px] leading-6"
              style={BR_FONT_STYLE.display}
            >
              Scan QR Code
            </BrText>
            <View className="w-9" />
          </View>
        </View>

        {!permission.granted ? (
          // Permission not granted view
          <View className="flex-1 items-center justify-center px-8">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-[#FFE7D4]">
              <Icon name="Camera" size={40} color={BR.orangeDeep} />
            </View>
            <BrText
              variant="h2"
              color="#fff"
              className="mb-3 text-center"
            >
              Camera access required
            </BrText>
            <Text
              className="mb-6 text-center text-base text-white/70"
              style={BR_FONT_STYLE.mono}
            >
              We need camera access to scan QR codes for joining group orders.
            </Text>
            <Pressable
              onPress={requestPermission}
              className="rounded-2xl bg-[#FF6A1F] px-8 py-4 active:opacity-85"
            >
              <Text className="text-base font-bold text-white">
                Grant permission
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              className="mt-4 px-8 py-4 active:opacity-70"
            >
              <Text className="text-base font-medium text-white/70">
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
                <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#FF6A1F] rounded-tl-lg" />
                <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FF6A1F] rounded-tr-lg" />
                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FF6A1F] rounded-bl-lg" />
                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#FF6A1F] rounded-br-lg" />
              </View>
            </View>

            {/* Bottom instructions */}
            <View className="absolute bottom-0 left-0 right-0 pb-12 pt-6 px-[18px] bg-black/60">
              <BrText
                weight="bold"
                color="#fff"
                className="text-center text-base"
                style={BR_FONT_STYLE.display}
              >
                Point your camera at a BiteRunr QR code
              </BrText>
              <Text
                className="mt-2 text-center text-xs text-white/60"
                style={BR_FONT_STYLE.mono}
              >
                The code will be scanned automatically
              </Text>
              <Pressable
                onPress={onEnterCode}
                className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 active:opacity-85"
              >
                <Icon name="Keyboard" size={16} color="#fff" />
                <Text className="text-center text-base font-bold text-white">
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
