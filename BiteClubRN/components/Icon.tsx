import React from "react";
import { icons } from "lucide-react-native";

type IconName = keyof typeof icons;

type IconProps = {
    name: IconName;
    color?: string;
    size?: number;
    strokeWidth?: number;
};

export default function Icon({
    name,
    color = "black",
    size = 24,
    strokeWidth = 2,
}: IconProps) {
    const LucideIcon = icons[name];

    if (!LucideIcon) {
        console.warn(`Icon "${name}" does not exist in lucide-react-native.`);
        return null;
    }

    return <LucideIcon color={color} size={size} strokeWidth={strokeWidth} />;
}
