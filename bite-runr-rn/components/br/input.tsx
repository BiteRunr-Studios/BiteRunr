import { forwardRef } from "react";
import { View, TextInput, type TextInputProps, Pressable } from "react-native";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import Icon, { type IconName } from "@/components/common/icon";
import { BrText } from "./text";

interface BrInputProps extends Omit<TextInputProps, "placeholderTextColor"> {
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  errorMessage?: string | null;
}

export const BrInput = forwardRef<TextInput, BrInputProps>(function BrInput(
  { leftIcon, rightIcon, onRightIconPress, errorMessage, style, ...rest },
  ref,
) {
  const hasError = Boolean(errorMessage);
  return (
    <View>
      <View
        className={`flex-row items-center gap-3 h-[54px] px-4 rounded-2xl border bg-white ${
          hasError ? "border-[#FF4D6D]" : "border-[rgba(26,20,16,0.14)]"
        }`}
      >
        {leftIcon ? <Icon name={leftIcon} size={18} color={BR.ink2} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={BR.ink3}
          className="flex-1 self-stretch py-0"
          style={[
            BR_FONT_STYLE.displayMedium,
            {
              fontSize: 16,
              lineHeight: 22,
              color: BR.ink,
              letterSpacing: 0,
              paddingVertical: 0,
              includeFontPadding: false,
              textAlignVertical: "center",
            },
            style,
          ]}
          {...rest}
        />
        {rightIcon ? (
          onRightIconPress ? (
            <Pressable onPress={onRightIconPress} hitSlop={8}>
              <Icon name={rightIcon} size={20} color={BR.ink2} />
            </Pressable>
          ) : (
            <Icon name={rightIcon} size={20} color={BR.ink2} />
          )
        ) : null}
      </View>
      {hasError ? (
        <View className="flex-row items-center gap-1 mt-1.5 px-1">
          <Icon name="CircleAlert" size={14} color={BR.coral} />
          <BrText className="text-xs font-medium text-[#B82340]">
            {errorMessage}
          </BrText>
        </View>
      ) : null}
    </View>
  );
});
