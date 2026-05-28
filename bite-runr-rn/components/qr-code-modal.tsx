import React, { useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Share,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import Icon from "@/components/common/icon";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type QRCodeModalProps = {
  visible: boolean;
  orderId: Id<"orders">;
  orderName: string;
  onClose: () => void;
};

export function QRCodeModal({
  visible,
  orderId,
  orderName,
  onClose,
}: QRCodeModalProps) {
  const activeInvite = useQuery(api.orderInvites.getActiveInvite, { orderId });
  const createInvite = useMutation(api.orderInvites.createInvite);
  const [isCreating, setIsCreating] = React.useState(false);
  const [createAttempted, setCreateAttempted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (visible && activeInvite === null && !isCreating && !createAttempted) {
      setIsCreating(true);
      setCreateAttempted(true);
      createInvite({ orderId })
        .catch((err) => console.error("Failed to create invite:", err))
        .finally(() => setIsCreating(false));
    }
  }, [
    visible,
    activeInvite,
    orderId,
    createInvite,
    isCreating,
    createAttempted,
  ]);

  useEffect(() => {
    if (!visible) {
      setCreateAttempted(false);
      setCopied(false);
    }
  }, [visible]);

  const inviteCode = activeInvite?.code;
  const deepLink = inviteCode ? `biterunr://join/${inviteCode}` : null;

  useEffect(() => {
    if (!copied) return;

    const timeout = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timeout);
  }, [copied]);

  const getTimeRemaining = () => {
    if (!activeInvite?.expiresAt) return null;
    const remaining = activeInvite.expiresAt - Date.now();
    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const handleShare = async () => {
    if (!inviteCode) return;

    try {
      await Share.share({
        message: `Join my BiteRunr order "${orderName}"!\n\nOpen this link to join: ${deepLink}\n\nOr enter code: ${inviteCode}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } catch (error) {
      console.error("Error copying invite code:", error);
    }
  };

  const isLoading = activeInvite === undefined || isCreating;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-[rgba(26,20,16,0.55)] px-6"
        onPress={onClose}
      >
        <Pressable
          className="w-full items-center rounded-[28px] border border-[rgba(26,20,16,0.08)] bg-[#FFF7EE] px-6 py-7 shadow-[0_12px_30px_rgba(26,20,16,0.25)]"
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity
            onPress={onClose}
            className="absolute right-3.5 top-3.5 h-[34px] w-[34px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
            activeOpacity={0.7}
          >
            <Icon name="X" size={17} color={BR.ink} />
          </TouchableOpacity>

          <View className="mb-3.5 h-[60px] w-[60px] items-center justify-center rounded-full bg-[#FFE7D4]">
            <Icon name="QrCode" size={30} color={BR.orange} />
          </View>

          <BrText variant="h3" className="mb-1 text-center">
            Invite to Order
          </BrText>
          <Text
            className="mb-[22px] text-center text-[13px] text-[#8A7A6E]"
            style={BR_FONT_STYLE.mono}
          >
            Scan QR code or share the link to join
          </Text>

          {isLoading ? (
            <View className="h-48 w-48 items-center justify-center">
              <ActivityIndicator size="large" color={BR.orange} />
              <Text
                className="mt-3.5 text-[13px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                Generating invite…
              </Text>
            </View>
          ) : deepLink ? (
            <>
              <View className="mb-4 rounded-[22px] border border-[rgba(26,20,16,0.14)] bg-white p-4">
                <QRCode
                  value={deepLink}
                  size={180}
                  backgroundColor="#FFFFFF"
                  color={BR.ink}
                />
              </View>

              <TouchableOpacity
                onPress={handleCopyInviteCode}
                activeOpacity={0.82}
                className="mb-3.5 w-full rounded-2xl border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0] px-4 py-3.5"
                accessibilityRole="button"
                accessibilityLabel={`Copy invite code ${inviteCode}`}
              >
                <View className="mb-1 flex-row items-center justify-center gap-1.5">
                  <Text
                    className="text-center text-[10px] tracking-[1.4px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.monoBold}
                  >
                    INVITE CODE
                  </Text>
                  <Icon
                    name={copied ? "Check" : "Copy"}
                    size={13}
                    color={copied ? BR.mint : BR.ink3}
                  />
                </View>
                <Text
                  className="text-center text-2xl tracking-[4px] text-[#1A1410]"
                  style={BR_FONT_STYLE.monoBold}
                >
                  {inviteCode}
                </Text>
                <Text
                  className={`mt-1.5 text-center text-[11px] ${copied ? "text-[#2EBE7B]" : "text-[#8A7A6E]"}`}
                  style={BR_FONT_STYLE.mono}
                >
                  {copied ? "Copied" : "Tap to copy"}
                </Text>
              </TouchableOpacity>

              {getTimeRemaining() && (
                <View className="mb-[18px] flex-row items-center gap-1.5">
                  <Icon name="Clock" size={13} color={BR.ink3} />
                  <Text
                    className="text-xs text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    {getTimeRemaining()}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.85}
                className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 shadow-[0_8px_16px_rgba(255,106,31,0.45)]"
              >
                <Icon name="Share" size={18} color="#fff" />
                <Text className="text-[15px] font-bold tracking-[-0.2px] text-white">
                  Share Invite
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="w-48 items-center justify-center py-4">
              <Icon name="CircleAlert" size={44} color={BR.coral} />
              <Text
                className="mt-3 text-center text-[13px] text-[#8A7A6E]"
                style={BR_FONT_STYLE.mono}
              >
                Failed to create invite. Please try again.
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
