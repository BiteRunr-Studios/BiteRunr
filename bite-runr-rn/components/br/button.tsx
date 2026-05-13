import React from "react";
import {
  Pressable,
  PressableProps,
  ActivityIndicator,
  View,
  ViewStyle,
  StyleSheet,
} from "react-native";
import { BR, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";
import { BrText } from "./text";

type Variant = "primary" | "ghost" | "ink" | "mint" | "mintSoft";

interface BrButtonProps extends Omit<PressableProps, "children"> {
  variant?: Variant;
  label: string;
  loading?: boolean;
  pill?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  fullWidth?: boolean;
  size?: "md" | "lg";
}

export function BrButton({
  variant = "primary",
  label,
  loading,
  pill,
  leftSlot,
  rightSlot,
  fullWidth = true,
  size = "md",
  style,
  disabled,
  ...rest
}: BrButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border ? 1 : 0,
          borderRadius: pill ? 999 : BR_RADIUS.md,
          paddingVertical: size === "lg" ? 16 : 14,
          paddingHorizontal: 18,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          transform: [{ scale: state.pressed ? 0.98 : 1 }],
        },
        v.shadow,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {leftSlot}
          <BrText
            color={v.fg}
            weight="semibold"
            style={{ fontSize: size === "lg" ? 16 : 15, letterSpacing: -0.2 }}
          >
            {label}
          </BrText>
          {rightSlot}
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<
  Variant,
  { bg: string; fg: string; border?: string; shadow?: ViewStyle }
> = {
  primary: { bg: BR.orange, fg: "#fff", shadow: BR_SHADOW.primary },
  ghost: { bg: "transparent", fg: BR.ink, border: BR.line2 },
  ink: { bg: BR.ink, fg: "#fff" },
  mint: { bg: BR.mint, fg: "#fff", shadow: BR_SHADOW.mint },
  mintSoft: { bg: BR.mintSoft, fg: BR.mintInk, border: "rgba(46,190,123,0.25)" },
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
