// Skeleton.tsx
import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

type SkeletonProps = {
    width?: number;
    height?: number;
    radius?: number;
    className?: string;
};

export default function Skeleton({
    width,
    height = 20,
    radius = 4,
    className,
}: SkeletonProps) {
    const { colorScheme } = useColorScheme();
    const animatedValue = useRef(new Animated.Value(0.3)).current;
    const baseColor = NAV_THEME[colorScheme].muted;
    const backgroundColor = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [hslToHsla(baseColor, 0.3), hslToHsla(baseColor, 1)],
    });

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    useNativeDriver: false,
                    duration: 500,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0.3,
                    useNativeDriver: false,
                    duration: 800,
                }),
            ])
        ).start();
    }, [animatedValue]);

    return (
        <Animated.View
            className={className}
            style={[
                {
                    height,
                    width,
                    backgroundColor: backgroundColor,
                    borderRadius: radius,
                },
            ]}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading"
        />
    );
}

function hslToHsla(hsl: string, alpha: number): string {
    const match = hsl.match(
        /hsl\((\d+(?:\.\d+)?),?\s*(\d+(?:\.\d+)?)%?,?\s*(\d+(?:\.\d+)?)%?\)/
    );
    if (!match) return hsl;

    const [, h, s, l] = match;
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}
