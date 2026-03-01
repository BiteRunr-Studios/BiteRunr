import React, { useEffect } from "react";
import { Image, StyleSheet, Dimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ICON_SIZE = SCREEN_WIDTH * 0.35;

interface AnimatedSplashScreenProps {
    onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({
    onAnimationComplete,
}: AnimatedSplashScreenProps) {
    const logoScale = useSharedValue(1);
    const logoOpacity = useSharedValue(0);
    const screenOpacity = useSharedValue(1);

    useEffect(() => {
        // Phase 1: Icon fades in and scales from 1x to 1.5x
        logoOpacity.value = withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
        });
        logoScale.value = withTiming(1.5, {
            duration: 1600,
            easing: Easing.out(Easing.cubic),
        });

        // Phase 2: Entire screen fades out
        screenOpacity.value = withDelay(
            1600,
            withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, () => {
                runOnJS(onAnimationComplete)();
            }),
        );
    }, []);

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        opacity: logoOpacity.value,
        transform: [{ scale: logoScale.value }],
    }));

    const screenAnimatedStyle = useAnimatedStyle(() => ({
        opacity: screenOpacity.value,
    }));

    return (
        <Animated.View style={[styles.container, screenAnimatedStyle]}>
            <Animated.View style={[styles.iconContainer, logoAnimatedStyle]}>
                <Image
                    source={require("@/assets/images/icon-dark.png")}
                    style={styles.icon}
                    resizeMode="contain"
                />
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },
    iconContainer: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        justifyContent: "center",
        alignItems: "center",
    },
    icon: {
        width: "100%",
        height: "100%",
    },
});
