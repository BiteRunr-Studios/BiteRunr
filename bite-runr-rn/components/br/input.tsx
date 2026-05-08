import React, { forwardRef } from "react";
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
} from "react-native";
import { BR, BR_RADIUS } from "@/lib/br-theme";
import Icon, { IconName } from "@/components/common/icon";
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
        style={[
          styles.box,
          {
            borderColor: hasError ? BR.coral : BR.line2,
            backgroundColor: BR.card,
          },
          style as object,
        ]}
      >
        {leftIcon ? <Icon name={leftIcon} size={18} color={BR.ink2} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={BR.ink3}
          style={styles.input}
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
        <View style={styles.errRow}>
          <Icon name="CircleAlert" size={14} color={BR.coral} />
          <BrText style={{ fontSize: 12, color: BR.coralInk, fontWeight: "500" }}>
            {errorMessage}
          </BrText>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: BR.ink,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  errRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 4,
  },
});
