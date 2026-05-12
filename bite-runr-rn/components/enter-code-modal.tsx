import React, { useState } from "react";
import {
  View,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/common/icon";
import { BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";
import { COLORS } from "@/lib/fonts";

type EnterCodeModalProps = {
  visible: boolean;
  onSubmit: (code: string) => void;
  onClose: () => void;
};

export function EnterCodeModal({
  visible,
  onSubmit,
  onClose,
}: EnterCodeModalProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onShow={() => setCode("")}
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingVertical: 10,
            position: "relative",
          }}
        >
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: COLORS.paper2,
              borderWidth: 1,
              borderColor: COLORS.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="ChevronLeft" size={20} color={COLORS.ink} />
          </Pressable>
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 10,
              bottom: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            pointerEvents="none"
          >
            <BrText weight="bold" style={{ fontSize: 17, lineHeight: 24 }}>
              Enter Invite Code
            </BrText>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.badge}>
            <Icon name="Ticket" size={24} color={BR.orangeDeep} />
          </View>

          <BrText variant="h2" style={styles.title}>
            Join a food run
          </BrText>
          <BrText color={BR.ink3} style={styles.help}>
            Enter the 8-character code shared with you to join an order.
          </BrText>

          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            placeholder="AB2CDEFG"
            placeholderTextColor={BR.ink3}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            style={styles.input}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={code.trim().length === 0}
            style={[
              styles.footerBtn,
              code.trim().length === 0 && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
          >
            <Text style={styles.footerBtnText}>Join Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  footerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: BR_RADIUS.md,
    width: "100%",
    backgroundColor: BR.orange,
  },
  screen: {
    flex: 1,
    backgroundColor: BR.paper,
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BR.line,
    backgroundColor: BR.paper,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 44,
    alignItems: "center",
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BR.orangeSoft,
    marginBottom: 18,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  help: {
    maxWidth: 280,
    textAlign: "center",
    marginBottom: 28,
  },
  input: {
    alignSelf: "stretch",
    height: 64,
    paddingHorizontal: 18,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1.25,
    borderColor: BR.line2,
    backgroundColor: BR.card,
    color: BR.ink,
    fontFamily: BR_FONT.monoBold,
    fontSize: 25,
    textAlign: "center",
    marginBottom: 18,
  },
  primaryButton: {
    alignSelf: "stretch",
    minHeight: 56,
    borderRadius: BR_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BR.orange,
    ...BR_SHADOW.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 16,
  },
});
