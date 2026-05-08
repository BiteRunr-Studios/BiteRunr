import React from "react";
import { View, ViewStyle } from "react-native";
import { BR } from "@/lib/br-theme";
import { BrText } from "./text";

interface BrStickerProps {
  rotate?: number;
  background?: string;
  style?: ViewStyle;
  leftSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function BrSticker({
  rotate = -2,
  background = "#fff",
  style,
  leftSlot,
  children,
}: BrStickerProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 12,
          backgroundColor: background,
          borderWidth: 1.5,
          borderColor: BR.ink,
          alignSelf: "flex-start",
          transform: [{ rotate: `${rotate}deg` }],
          shadowColor: BR.ink,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 0,
        },
        style,
      ]}
    >
      {leftSlot}
      <BrText weight="bold" style={{ fontSize: 12 }}>
        {children}
      </BrText>
    </View>
  );
}
