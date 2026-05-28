import { useState } from "react";
import {
  View,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/common/icon";
import { BrText } from "@/components/br";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";

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
  const isDisabled = code.trim().length === 0;

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
      <View className="flex-1 bg-[#FFF7EE]" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="relative flex-row items-center justify-between px-[18px] py-2.5">
          <Pressable
            onPress={onClose}
            className="h-9 w-9 items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
          <View
            className="absolute bottom-2.5 left-0 right-0 top-2.5 items-center justify-center"
            pointerEvents="none"
          >
            <BrText
              weight="bold"
              className="text-[17px] leading-6"
              style={BR_FONT_STYLE.display}
            >
              Enter Invite Code
            </BrText>
          </View>
          <View className="w-9" />
        </View>

        <View className="flex-1 items-center px-6 pt-11">
          <View className="mb-[18px] h-16 w-16 items-center justify-center rounded-full bg-[#FFE7D4]">
            <Icon name="Ticket" size={24} color={BR.orangeDeep} />
          </View>

          <BrText variant="h2" className="mb-2 text-center">
            Join a food run
          </BrText>
          <BrText color={BR.ink3} className="mb-7 max-w-[280px] text-center">
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
            className="mb-[18px] h-16 self-stretch rounded-[22px] border border-[rgba(26,20,16,0.14)] bg-white px-[18px] text-center text-[25px] text-[#1A1410]"
            style={BR_FONT_STYLE.monoBold}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isDisabled}
            className={`w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 active:opacity-85 ${
              isDisabled ? "opacity-45" : ""
            }`}
            activeOpacity={0.85}
          >
            <Text className="text-base font-bold text-white">Join Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
