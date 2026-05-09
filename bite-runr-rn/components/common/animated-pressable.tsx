import React, { useCallback } from "react";
import { Pressable } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    Easing,
} from "react-native-reanimated";

interface AnimatedPressableProps extends React.ComponentProps<typeof Pressable> {
    /** Target scale when pressed. Defaults to 0.97. */
    scale?: number;
}

/**
 * Pressable with a spring-back scale animation on press.
 * Uses Animated.View as the animation layer so useAnimatedStyle
 * is applied directly to an Animated component — the correct
 * Reanimated pattern that avoids style tracking issues.
 */
export const AnimatedPressable = React.memo(function AnimatedPressable({
    children,
    style,
    scale: targetScale = 0.97,
    onPressIn: onPressInProp,
    onPressOut: onPressOutProp,
    ...props
}: AnimatedPressableProps) {
    const sv = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: sv.value }],
    }));

    const onPressIn = useCallback(
        (e: any) => {
            sv.value = withTiming(targetScale, {
                duration: 80,
                easing: Easing.out(Easing.ease),
            });
            onPressInProp?.(e);
        },
        [sv, targetScale, onPressInProp],
    );

    const onPressOut = useCallback(
        (e: any) => {
            sv.value = withSpring(1, { damping: 18, stiffness: 600, overshootClamping: true });
            onPressOutProp?.(e);
        },
        [sv, onPressOutProp],
    );

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                {...props}
                style={style}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
            >
                {children}
            </Pressable>
        </Animated.View>
    );
});
