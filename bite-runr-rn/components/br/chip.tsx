import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { BR } from "@/lib/br-theme";
import { BrText } from "./text";

type Color = "neutral" | "orange" | "mint" | "lilac" | "coral" | "yolk";

const COLORS: Record<Color, { bg: string; fg: string }> = {
  neutral: { bg: BR.paper2, fg: BR.ink2 },
  orange: { bg: BR.orangeSoft, fg: BR.orangeDeep },
  mint: { bg: BR.mintSoft, fg: BR.mintInk },
  lilac: { bg: BR.lilacSoft, fg: BR.lilacInk },
  coral: { bg: BR.coralSoft, fg: BR.coralInk },
  yolk: { bg: BR.yolkSoft, fg: "#7A4A20" },
};

interface BrChipProps extends ViewProps {
  color?: Color;
  size?: "md" | "lg";
  leftSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function BrChip({
  color = "neutral",
  size = "md",
  leftSlot,
  style,
  children,
  ...rest
}: BrChipProps) {
  const c = COLORS[color];
  const isLg = size === "lg";
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor: c.bg,
          height: isLg ? 32 : 28,
          paddingHorizontal: isLg ? 12 : 10,
        },
        style,
      ]}
    >
      {leftSlot}
      <BrText
        color={c.fg}
        weight="semibold"
        style={{ fontSize: isLg ? 13 : 12 }}
      >
        {children}
      </BrText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});
