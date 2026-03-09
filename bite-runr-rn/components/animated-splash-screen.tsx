import React, { useEffect } from "react";
import { Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
} from "react-native-reanimated";
import { useColorScheme } from "@/lib/use-color-scheme";

const LIGHT_SPLASH_BACKGROUND = "#FFFFFF";
const DARK_SPLASH_BACKGROUND = "#000000";

interface AnimatedSplashScreenProps {
    onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({
    onAnimationComplete,
}: AnimatedSplashScreenProps) {
    const { width } = useWindowDimensions();
    const { colorScheme } = useColorScheme();
    const logoScale = useSharedValue(1);
    const logoOpacity = useSharedValue(0);
    const screenOpacity = useSharedValue(1);
    const iconSize = width * 0.35;
    const backgroundColor =
        colorScheme === "dark"
            ? DARK_SPLASH_BACKGROUND
            : LIGHT_SPLASH_BACKGROUND;

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
            withTiming(
                0,
                { duration: 400, easing: Easing.in(Easing.cubic) },
                () => {
                    runOnJS(onAnimationComplete)();
                },
            ),
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
        <Animated.View
            style={[
                styles.container,
                { backgroundColor },
                screenAnimatedStyle,
            ]}>
            <Animated.View
                style={[
                    styles.iconContainer,
                    { width: iconSize, height: iconSize },
                    logoAnimatedStyle,
                ]}>
                <Image
                    source={require("@/assets/images/icon-no-bg.png")}
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
        backgroundColor: LIGHT_SPLASH_BACKGROUND,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },
    iconContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    icon: {
        width: "100%",
        height: "100%",
    },
});
