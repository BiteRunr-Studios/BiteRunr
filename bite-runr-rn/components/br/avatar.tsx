import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { avatarColors } from "@/lib/br-theme";

interface BrAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  ring?: string;
  bg?: string;
  fg?: string;
}

export const BrAvatar = React.memo(function BrAvatar({
  name,
  avatarUrl,
  size = 36,
  ring,
  bg,
  fg,
}: BrAvatarProps) {
  const ringStyle = ring
    ? {
        borderWidth: 2.5,
        borderColor: ring,
      }
    : null;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[
          { width: size, height: size, borderRadius: size / 2 },
          ringStyle,
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={{ duration: 200 }}
      />
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n.charAt(0) || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const palette = avatarColors(name);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg ?? palette.bg,
          alignItems: "center",
          justifyContent: "center",
        },
        ringStyle,
      ]}
    >
      <Text
        style={{
          fontSize: size * 0.36,
          fontWeight: "700",
          color: fg ?? palette.fg,
          letterSpacing: -0.5,
        }}
      >
        {initials || "U"}
      </Text>
    </View>
  );
});
