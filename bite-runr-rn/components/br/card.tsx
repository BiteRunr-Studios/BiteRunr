import type React from "react";
import { View, type ViewProps, type ViewStyle, StyleSheet } from "react-native";
import { BR, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";

interface BrCardProps extends ViewProps {
  variant?: "flat" | "outlined" | "shadowed";
  padding?: number;
  radius?: keyof typeof BR_RADIUS;
  background?: string;
  borderColor?: string;
  children?: React.ReactNode;
}

export function BrCard({
  variant = "shadowed",
  padding = 16,
  radius = "lg",
  background,
  borderColor,
  style,
  children,
  ...rest
}: BrCardProps) {
  const variantStyle: ViewStyle =
    variant === "shadowed"
      ? { ...BR_SHADOW.card, borderColor: borderColor ?? "rgba(26,20,16,0.05)" }
      : variant === "outlined"
        ? { borderWidth: 1.25, borderColor: borderColor ?? BR.line2 }
        : { borderWidth: 1, borderColor: borderColor ?? BR.line };

  return (
    <View
      {...rest}
      style={[
        styles.base,
        variantStyle,
        {
          padding,
          borderRadius: BR_RADIUS[radius],
          backgroundColor: background ?? BR.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
