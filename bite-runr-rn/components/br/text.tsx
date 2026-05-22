import type React from "react";
import { Text, type TextProps, type TextStyle, StyleSheet } from "react-native";
import { cssInterop } from "nativewind";
import { BR, BR_FONT } from "@/lib/br-theme";

type Variant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "label"
  | "meta"
  | "eyebrow"
  | "mono";

interface BrTextProps extends TextProps {
  variant?: Variant;
  italic?: boolean;
  color?: string;
  weight?: "regular" | "medium" | "semibold" | "bold" | "extrabold";
  children?: React.ReactNode;
}

function BrTextInner({
  variant = "body",
  italic,
  color,
  weight,
  style,
  children,
  ...rest
}: BrTextProps) {
  const base = styles[variant];
  const fontStyle: TextStyle = italic ? { fontStyle: "italic" } : {};
  const colorStyle: TextStyle = color ? { color } : {};
  const weightStyle: TextStyle = weight
    ? { fontWeight: WEIGHT_MAP[weight] as TextStyle["fontWeight"] }
    : {};
  return (
    <Text {...rest} style={[base, fontStyle, colorStyle, weightStyle, style]}>
      {children}
    </Text>
  );
}

export const BrText = cssInterop(BrTextInner, { className: "style" });

const WEIGHT_MAP = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

const styles = StyleSheet.create({
  h1: {
    fontFamily: BR_FONT.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1,
    color: BR.ink,
  },
  h2: {
    fontFamily: BR_FONT.display,
    fontSize: 26,
    lineHeight: 29,
    letterSpacing: -0.7,
    color: BR.ink,
  },
  h3: {
    fontFamily: BR_FONT.display,
    fontSize: 20,
    lineHeight: 23,
    letterSpacing: -0.4,
    color: BR.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: BR.ink,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: BR.ink2,
  },
  meta: {
    fontSize: 13,
    color: BR.ink3,
  },
  eyebrow: {
    fontFamily: BR_FONT.mono,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: BR.ink3,
  },
  mono: {
    fontFamily: BR_FONT.mono,
    fontSize: 13,
    color: BR.ink2,
  },
});
