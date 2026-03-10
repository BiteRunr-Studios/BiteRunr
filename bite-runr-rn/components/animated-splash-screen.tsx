"use no memo";

import React from "react";
import {
  AccessibilityInfo,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  makeMutable,
  runOnJS,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useColorScheme } from "@/lib/use-color-scheme";

const MINIMUM_VISIBLE_MS = 900;
const LIGHT_SPLASH_BACKGROUND = "#FFFFFF";
const DARK_SPLASH_BACKGROUND = "#000000";

interface AnimatedSplashScreenProps {
  ready: boolean;
  onHidden: () => void;
  onFirstFrame: () => void;
}

export default function AnimatedSplashScreen({
  ready,
  onHidden,
  onFirstFrame,
}: AnimatedSplashScreenProps) {
  "use no memo";

  const { width } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const backgroundColor =
    colorScheme === "dark" ? DARK_SPLASH_BACKGROUND : LIGHT_SPLASH_BACKGROUND;
  const iconSize = Math.min(Math.max(width * 0.34, 140), 180);
  const screenOpacity = React.useRef(makeMutable(1)).current;
  const iconOpacity = React.useRef(makeMutable(0)).current;
  const iconScale = React.useRef(makeMutable(0.97)).current;
  const iconTranslateY = React.useRef(makeMutable(8)).current;
  const [reduceMotionEnabled, setReduceMotionEnabled] = React.useState<
    boolean | null
  >(null);
  const startedAtRef = React.useRef(0);
  const hasReportedFirstFrameRef = React.useRef(false);
  const hasStartedEntranceRef = React.useRef(false);
  const hasStartedExitRef = React.useRef(false);
  const reduceMotionRef = React.useRef(false);
  const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExitTimer = React.useCallback(() => {
    if (!exitTimerRef.current) {
      return;
    }

    clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;
  }, []);

  const startExit = React.useCallback(() => {
    if (hasStartedExitRef.current) {
      return;
    }

    hasStartedExitRef.current = true;
    clearExitTimer();

    const exitDuration = reduceMotionRef.current ? 160 : 220;

    iconOpacity.value = withTiming(0.92, {
      duration: exitDuration,
      easing: Easing.out(Easing.cubic),
    });
    iconTranslateY.value = withTiming(-4, {
      duration: exitDuration,
      easing: Easing.out(Easing.cubic),
    });
    iconScale.value = withTiming(0.985, {
      duration: exitDuration,
      easing: Easing.out(Easing.cubic),
    });
    screenOpacity.value = withTiming(
      0,
      {
        duration: exitDuration,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onHidden)();
        }
      },
    );
  }, [
    clearExitTimer,
    iconOpacity,
    iconScale,
    iconTranslateY,
    onHidden,
    screenOpacity,
  ]);

  React.useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!isMounted) {
          return;
        }

        reduceMotionRef.current = enabled;
        setReduceMotionEnabled(enabled);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        reduceMotionRef.current = false;
        setReduceMotionEnabled(false);
      });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotionRef.current = enabled;
        setReduceMotionEnabled(enabled);
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  React.useEffect(() => {
    if (reduceMotionEnabled === null || hasStartedEntranceRef.current) {
      return;
    }

    hasStartedEntranceRef.current = true;

    const entranceDuration = reduceMotionEnabled ? 150 : 240;

    iconOpacity.value = withTiming(1, {
      duration: entranceDuration,
      easing: Easing.out(Easing.cubic),
    });
    iconTranslateY.value = withTiming(0, {
      duration: entranceDuration,
      easing: Easing.out(Easing.cubic),
    });
    iconScale.value = withTiming(1, {
      duration: entranceDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [iconOpacity, iconScale, iconTranslateY, reduceMotionEnabled]);

  React.useEffect(() => {
    if (!ready || hasStartedExitRef.current) {
      return;
    }

    const remainingVisibleMs = Math.max(
      MINIMUM_VISIBLE_MS - (Date.now() - startedAtRef.current),
      0,
    );

    if (remainingVisibleMs === 0) {
      startExit();
      return;
    }

    exitTimerRef.current = setTimeout(() => {
      startExit();
    }, remainingVisibleMs);

    return clearExitTimer;
  }, [clearExitTimer, ready, startExit]);

  React.useEffect(() => {
    return clearExitTimer;
  }, [clearExitTimer]);

  const handleLayout = React.useCallback(
    (_event: LayoutChangeEvent) => {
      if (hasReportedFirstFrameRef.current) {
        return;
      }

      hasReportedFirstFrameRef.current = true;
      onFirstFrame();
    },
    [onFirstFrame],
  );

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [
      { translateY: iconTranslateY.value },
      { scale: iconScale.value },
    ],
  }));

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[styles.container, { backgroundColor }, screenAnimatedStyle]}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            width: iconSize,
            height: iconSize,
          },
          iconAnimatedStyle,
        ]}
      >
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
