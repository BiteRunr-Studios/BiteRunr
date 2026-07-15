import React, { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";

interface SkeletonBlockProps {
  width: number | `${number}%`;
  height: number;
  rounded?: string;
  className?: string;
  style?: ViewStyle;
  /**
   * Explicit base color. Defaults to the theme `bg-muted` (dark in dark mode),
   * which suits dark cards. Pass a light tone for always-cream screens so the
   * blocks don't render as dark slabs.
   */
  color?: string;
}

interface SkeletonProps {
  children: React.ReactNode;
}

const SkeletonContext = React.createContext<{
  sweep: SharedValue<number>;
} | null>(null);

/**
 * Wrapper component that provides the shimmer animation to all SkeletonBlock children
 */
export function Skeleton({ children }: SkeletonProps) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, {
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [sweep]);

  return (
    <SkeletonContext.Provider value={{ sweep }}>
      {children}
    </SkeletonContext.Provider>
  );
}

/**
 * Individual skeleton block with shimmer effect
 */
export function SkeletonBlock({
  width,
  height,
  rounded = "rounded-lg",
  className = "",
  style,
  color,
}: SkeletonBlockProps) {
  const context = React.useContext(SkeletonContext);

  const shimmerStyle = useAnimatedStyle(() => {
    if (!context) return {};
    const translatePercent = -40 + context.sweep.value * 80;
    return {
      transform: [{ translateX: translatePercent }],
      opacity: 0.18,
    };
  }, [context]);

  const widthValue = typeof width === "number" ? width : undefined;
  const widthPercent = typeof width === "string" ? width : undefined;

  return (
    <View
      className={`${color ? "" : "bg-muted"} ${rounded} overflow-hidden ${className}`}
      style={[
        {
          width: widthValue,
          height,
          ...(color ? { backgroundColor: color } : null),
        },
        widthPercent ? { width: widthPercent as any } : undefined,
        style,
      ]}
    >
      {context && (
        <Animated.View
          style={[
            {
              position: "absolute" as const,
              top: 0,
              bottom: 0,
              width: typeof width === "number" ? width * 0.35 : "35%",
              backgroundColor: "#ffffff",
            },
            shimmerStyle,
          ]}
        />
      )}
    </View>
  );
}
