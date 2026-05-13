import React, { useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Share,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import Icon from "@/components/common/icon";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";
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
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <Icon name="X" size={17} color={BR.ink} />
          </TouchableOpacity>

          {/* Header icon */}
          <View style={styles.headerIcon}>
            <Icon name="QrCode" size={30} color={BR.orange} />
          </View>

          <BrText variant="h3" style={styles.title}>
            Invite to Order
          </BrText>
          <Text style={styles.subtitle}>
            Scan QR code or share the link to join
          </Text>

          {isLoading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator size="large" color={BR.orange} />
              <Text style={styles.loadingText}>Generating invite…</Text>
            </View>
          ) : deepLink ? (
            <>
              {/* QR Code */}
              <View style={styles.qrFrame}>
                <QRCode
                  value={deepLink}
                  size={180}
                  backgroundColor="#FFFFFF"
                  color={BR.ink}
                />
              </View>

              {/* Invite Code Display */}
              <TouchableOpacity
                onPress={handleCopyInviteCode}
                activeOpacity={0.82}
                style={styles.codeBox}
                accessibilityRole="button"
                accessibilityLabel={`Copy invite code ${inviteCode}`}
              >
                <View style={styles.codeLabelRow}>
                  <Text style={styles.codeLabel}>INVITE CODE</Text>
                  <Icon
                    name={copied ? "Check" : "Copy"}
                    size={13}
                    color={copied ? BR.mint : BR.ink3}
                  />
                </View>
                <Text style={styles.codeValue}>{inviteCode}</Text>
                <Text
                  style={[styles.copyHint, copied && styles.copyHintActive]}
                >
                  {copied ? "Copied" : "Tap to copy"}
                </Text>
              </TouchableOpacity>

              {/* Expiry info */}
              {getTimeRemaining() && (
                <View style={styles.expiryRow}>
                  <Icon name="Clock" size={13} color={BR.ink3} />
                  <Text style={styles.expiryText}>{getTimeRemaining()}</Text>
                </View>
              )}

              {/* Share button */}
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.85}
                style={styles.shareBtn}
              >
                <Icon name="Share" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share Invite</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.errorArea}>
              <Icon name="CircleAlert" size={44} color={BR.coral} />
              <Text style={styles.errorText}>
                Failed to create invite. Please try again.
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(26, 20, 16, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    backgroundColor: BR.paper,
    borderRadius: BR_RADIUS.xl,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BR.line,
    ...BR_SHADOW.pop,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: BR.ink3,
    textAlign: "center",
    marginBottom: 22,
    fontFamily: BR_FONT.mono,
  },
  loadingArea: {
    width: 192,
    height: 192,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 14,
    color: BR.ink3,
    fontSize: 13,
    fontFamily: BR_FONT.mono,
  },
  qrFrame: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderColor: BR.line2,
    marginBottom: 16,
  },
  codeBox: {
    width: "100%",
    backgroundColor: BR.paper2,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  codeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 4,
  },
  codeLabel: {
    fontSize: 10,
    fontFamily: BR_FONT.monoBold,
    color: BR.ink3,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  codeValue: {
    fontSize: 24,
    fontFamily: BR_FONT.monoBold,
    color: BR.ink,
    textAlign: "center",
    letterSpacing: 4,
  },
  copyHint: {
    marginTop: 6,
    fontSize: 11,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
    textAlign: "center",
  },
  copyHintActive: {
    color: BR.mint,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  expiryText: {
    fontSize: 12,
    color: BR.ink3,
    fontFamily: BR_FONT.mono,
  },
  shareBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orange,
    ...BR_SHADOW.primary,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  errorArea: {
    width: 192,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  errorText: {
    color: BR.ink3,
    textAlign: "center",
    marginTop: 12,
    fontSize: 13,
    fontFamily: BR_FONT.mono,
  },
});
