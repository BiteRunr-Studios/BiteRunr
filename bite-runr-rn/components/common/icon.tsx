// Icon.tsx
import type React from "react";
import { icons } from "lucide-react-native";
import type { SvgProps } from "react-native-svg";

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  color?: string;
  size?: number;
} & Omit<SvgProps, "width" | "height">;

const Icon: React.FC<IconProps> = ({ name, color, size, ...svgProps }) => {
  const LucideIcon = icons[name];
  return (
    <LucideIcon color={color} size={size} pointerEvents="none" {...svgProps} />
  );
};

export default Icon;
