import React, { useCallback } from "react";
import { Pressable, type PressableStateCallbackType, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
    children,
    style,
    onPressIn: onPressInProp,
    onPressOut: onPressOutProp,
    ...props
}: React.ComponentProps<typeof Pressable>) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const onPressIn = useCallback(
        (e: any) => {
            scale.value = withTiming(0.97, { duration: 150 });
            onPressInProp?.(e);
        },
        [onPressInProp],
    );
    const onPressOut = useCallback(
        (e: any) => {
            scale.value = withTiming(1, { duration: 200 });
            onPressOutProp?.(e);
        },
        [onPressOutProp],
    );

    // Pressable style can be a function (state) => style or a plain style.
    // We need to resolve it before combining with animatedStyle.
    const combinedStyle = useCallback(
        (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
            const resolved = typeof style === "function" ? style(state) : style;
            return [animatedStyle, resolved];
        },
        [animatedStyle, style],
    );

    return (
        <ReanimatedPressable
            {...props}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={combinedStyle}>
            {children}
        </ReanimatedPressable>
    );
}
