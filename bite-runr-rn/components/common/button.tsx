import { NAV_THEME } from "@/lib/constants";
import { useEffect, useRef } from "react";
import Icon, { IconName } from "@/components/common/icon";
import { Animated, Pressable, Text } from "react-native";
import { Flow } from "react-native-animated-spinkit";

type ButtonVariant = "full" | "outline";

type ButtonProps = {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: IconName;
    variant?: ButtonVariant;
    color?: string;
};

export const Button: React.FC<ButtonProps> = ({
    label,
    loading = false,
    disabled = false,
    onPress,
    icon,
    variant = "full",
    color = NAV_THEME.light.primary,
}) => {
    const spinnerWidth = useRef(new Animated.Value(0)).current;
    const spinnerOpacity = useRef(new Animated.Value(0)).current;

    const isDisabled = disabled || loading;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(spinnerWidth, {
                toValue: loading ? 30 : 0,
                duration: 100,
                useNativeDriver: false,
            }),
            Animated.timing(spinnerOpacity, {
                toValue: loading ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [loading]);

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            className={`w-full flex-row justify-center items-center h-[55px] gap-2 p-4 rounded-2xl ${
                isDisabled ? "opacity-50" : ""
            }`}
            style={
                variant === "full"
                    ? {
                          backgroundColor: color,
                      }
                    : {
                          borderColor: color,
                          borderWidth: 1,
                      }
            }
        >
            {/* Loading Spinner */}
            <Animated.View
                style={{
                    width: spinnerWidth,
                    opacity: spinnerOpacity,
                    overflow: "hidden",
                }}
            >
                {loading && (
                    <Flow
                        color={variant === "full" ? "white" : color}
                        size={22}
                    />
                )}
            </Animated.View>

            {icon && (
                <Icon
                    name={icon}
                    color={variant === "full" ? "white" : color}
                    size={22}
                />
            )}

            {/* Label */}
            <Text
                style={{ color: variant === "full" ? "white" : color }}
                className={`font-semibold text-lg`}
            >
                {label}
            </Text>
        </Pressable>
    );
};
