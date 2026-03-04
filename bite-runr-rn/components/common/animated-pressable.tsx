import React, { useCallback } from "react";
import { Pressable } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
    children,
    style,
    ...props
}: React.ComponentProps<typeof Pressable>) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const onPressIn = useCallback(() => {
        scale.value = withTiming(0.97, { duration: 150 });
    }, []);
    const onPressOut = useCallback(() => {
        scale.value = withTiming(1, { duration: 200 });
    }, []);

    return (
        <ReanimatedPressable
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={[animatedStyle, style]}
            {...props}>
            {children}
        </ReanimatedPressable>
    );
}
