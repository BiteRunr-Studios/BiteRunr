"use no memo";

import React from "react";
import {
  AccessibilityInfo,
  Image,
  type LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  makeMutable,
  runOnJS,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
const MINIMUM_VISIBLE_MS = 900;

interface AnimatedSplashScreenProps {
  ready: boolean;
  onHidden: () => void;
  onFirstFrame: () => void;
}

function useSplashAnimations(onHidden: () => void) {
  "use no memo";

  const mutables = React.useMemo(
    () => ({
      screenOpacity: makeMutable(1),
      iconOpacity: makeMutable(0),
      iconScale: makeMutable(0.97),
      iconTranslateY: makeMutable(8),
    }),
    [],
  );

  const startEntrance = React.useCallback(
    (reduceMotionEnabled: boolean) => {
      const entranceDuration = reduceMotionEnabled ? 150 : 240;

      mutables.iconOpacity.value = withTiming(1, {
        duration: entranceDuration,
        easing: Easing.out(Easing.cubic),
      });
      mutables.iconTranslateY.value = withTiming(0, {
        duration: entranceDuration,
        easing: Easing.out(Easing.cubic),
      });
      mutables.iconScale.value = withTiming(1, {
        duration: entranceDuration,
        easing: Easing.out(Easing.cubic),
      });
    },
    [mutables],
  );

  const startExit = React.useCallback(
    (reduceMotionEnabled: boolean) => {
      const exitDuration = reduceMotionEnabled ? 160 : 220;

      mutables.iconOpacity.value = withTiming(0.92, {
        duration: exitDuration,
        easing: Easing.out(Easing.cubic),
      });
      mutables.iconTranslateY.value = withTiming(-4, {
        duration: exitDuration,
        easing: Easing.out(Easing.cubic),
      });
      mutables.iconScale.value = withTiming(0.985, {
        duration: exitDuration,
        easing: Easing.out(Easing.cubic),
      });
      mutables.screenOpacity.value = withTiming(
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
    },
    [mutables, onHidden],
  );

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mutables.screenOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mutables.iconOpacity.value,
    transform: [
      { translateY: mutables.iconTranslateY.value },
      { scale: mutables.iconScale.value },
    ],
  }));

  return {
    screenAnimatedStyle,
    iconAnimatedStyle,
    startEntrance,
    startExit,
  };
}

export default function AnimatedSplashScreen({
  ready,
  onHidden,
  onFirstFrame,
}: AnimatedSplashScreenProps) {
  "use no memo";

  const { width } = useWindowDimensions();
  const iconSize = Math.min(Math.max(width * 0.34, 140), 180);
  const [reduceMotionEnabled, setReduceMotionEnabled] = React.useState<
    boolean | null
  >(null);
  const startedAtRef = React.useRef(0);
  const hasReportedFirstFrameRef = React.useRef(false);
  const hasStartedEntranceRef = React.useRef(false);
  const hasStartedExitRef = React.useRef(false);
  const reduceMotionRef = React.useRef(false);
  const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { screenAnimatedStyle, iconAnimatedStyle, startEntrance, startExit } =
    useSplashAnimations(onHidden);

  const clearExitTimer = React.useCallback(() => {
    if (!exitTimerRef.current) {
      return;
    }

    clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;
  }, []);

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
    startEntrance(reduceMotionEnabled);
  }, [reduceMotionEnabled, startEntrance]);

  React.useEffect(() => {
    if (!ready || hasStartedExitRef.current) {
      return;
    }

    const remainingVisibleMs = Math.max(
      MINIMUM_VISIBLE_MS - (Date.now() - startedAtRef.current),
      0,
    );

    const runExit = () => {
      if (hasStartedExitRef.current) {
        return;
      }

      hasStartedExitRef.current = true;
      clearExitTimer();
      startExit(reduceMotionRef.current);
    };

    if (remainingVisibleMs === 0) {
      runExit();
      return;
    }

    const timeoutId = setTimeout(runExit, remainingVisibleMs);
    exitTimerRef.current = timeoutId;
    return () => {
      clearTimeout(timeoutId);
      if (exitTimerRef.current === timeoutId) {
        exitTimerRef.current = null;
      }
    };
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

  return (
    <Animated.View
      onLayout={handleLayout}
      className="absolute inset-0 z-[999] items-center justify-center bg-background"
      style={screenAnimatedStyle}
    >
      <Animated.View
        className="items-center justify-center"
        style={[{ width: iconSize, height: iconSize }, iconAnimatedStyle]}
      >
        <Image
          source={require("@/assets/images/icon-no-bg.png")}
          className="h-full w-full"
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}
