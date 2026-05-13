// Input.tsx
import { forwardRef } from "react";
import {
  TextInput,
  Text,
  View,
  type TextInputProps,
  Pressable,
} from "react-native";
import { NAV_THEME } from "@/lib/constants";
import Icon, { type IconName } from "@/components/common/icon";
import { useColorScheme } from "@/lib/use-color-scheme";

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  rightIconColor?: string;
  onRightIconPress?: () => void;
  className?: string;
  inputClassName?: string;
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  errorMessage: string | null;
} & Omit<
  TextInputProps,
  "value" | "onChangeText" | "placeholder" | "autoCorrect" | "secureTextEntry"
>;

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    value,
    onChangeText,
    placeholder,
    leftIcon,
    rightIcon,
    rightIconColor = NAV_THEME.light.primary,
    onRightIconPress,
    errorMessage = "",
    className = "flex-row items-center h-[55px] px-4 gap-3 rounded-xl border transition-all duration-200",
    inputClassName = "text-lg h-full font-regular text-vertical text-foreground focus:outline-none placeholder:text-muted-foreground flex-1",
    autoCorrect = false,
    secureTextEntry = false,
    ...textInputProps
  },
  ref,
) {
  const { colorScheme } = useColorScheme();

  return (
    <>
      <View
        className={`${className} ${
          errorMessage ? "border-red-500" : "border-muted"
        }`}
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {leftIcon ? (
          <Icon name={leftIcon} size={19} color={NAV_THEME[colorScheme].text} />
        ) : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={NAV_THEME[colorScheme].border}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          className={inputClassName}
          style={{
            letterSpacing: 0,
            lineHeight: 19,
            paddingVertical: 0,
            includeFontPadding: false,
            textAlignVertical: "center",
          }}
          {...textInputProps}
        />
        {rightIcon ? (
          onRightIconPress ? (
            <Pressable
              onPress={onRightIconPress}
              accessibilityRole="button"
              accessibilityLabel="Action"
              hitSlop={8}
            >
              <Icon name={rightIcon} size={24} color={rightIconColor} />
            </Pressable>
          ) : (
            <Icon name={rightIcon} size={24} color={rightIconColor} />
          )
        ) : null}
      </View>

      <View
        className={`mt-1 flex-row gap-1 items-center overflow-hidden transition-all duration-200
                ${
                  errorMessage
                    ? "opacity-100 translate-y-0 max-h-8"
                    : "opacity-0 -translate-y-1 max-h-0"
                }`}
      >
        <Icon name="CircleAlert" color="red" size={16} />
        <Text className="text-sm font-medium text-red-500">{errorMessage}</Text>
      </View>
    </>
  );
});
