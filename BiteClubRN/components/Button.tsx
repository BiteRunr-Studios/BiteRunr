import {
  View,
  Text,
  TextInput,
  useColorScheme,
  TouchableOpacity,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { IconSymbol, IconSymbolName } from "@/components/ui/IconSymbol";

type Props<T> = {
  label: string;
  sfSymbolName: IconSymbolName;
  isOutline?: boolean;
  isDisabled?: boolean;
  action: () => T | void;
};

const Button = <T,>({
  label,
  sfSymbolName,
  isDisabled = false,
  isOutline = false,
  action,
}: Props<T>) => {
  const colorScheme = useColorScheme(); // 'light' or 'dark'
  const themeColors = Colors[colorScheme ?? "light"];

  return (
    <TouchableOpacity
      disabled={isDisabled}
      style={{
        display: "flex",
        backgroundColor: isOutline ? "transparent" : themeColors.tint,
        borderRadius: 10,
        padding: Spacing.buttonPadding,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.buttonIconTextGap,
        borderWidth: isOutline ? 1 : 0,
        borderColor: isOutline ? themeColors.tint : "transparent",
        opacity: isDisabled ? 0.5 : 1,
      }}
      onPress={() => {
        const result = action();
        if (result) console.log("Action result:", result);
      }}
    >
      <IconSymbol size={28} name={sfSymbolName} color={isOutline? themeColors.tint: themeColors.ctaText} />
      <Text
        style={{
          fontSize: 16,
          fontWeight: "bold",
          color: isOutline? themeColors.tint: themeColors.ctaText,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;
