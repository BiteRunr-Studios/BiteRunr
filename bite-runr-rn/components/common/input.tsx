// Input.tsx
import React from "react";
import { TextInput, Text, View, TextInputProps, Pressable } from "react-native";
import { NAV_THEME } from "@/lib/constants";
import Icon, { IconName } from "@/components/common/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import {
    Control,
    Controller,
    FieldValues,
    Path,
    RegisterOptions,
} from "react-hook-form";

type InputProps<TFieldValues extends FieldValues> = {
    control: Control<TFieldValues>;
    name: Path<TFieldValues>;
    rules?: RegisterOptions<TFieldValues>;
    placeholder?: string;
    leftIcon?: IconName;
    rightIcon?: IconName;
    rightIconColor?: string;
    onRightIconPress?: () => void;
    className?: string;
    inputClassName?: string;
    autoCorrect?: boolean;
    secureTextEntry?: boolean;
    helperText?: string;
} & Omit<
    TextInputProps,
    "value" | "onChangeText" | "placeholder" | "autoCorrect" | "secureTextEntry"
>;

export function Input<TFieldValues extends FieldValues>({
    control,
    name,
    rules = {},
    placeholder,
    leftIcon,
    rightIcon,
    rightIconColor = NAV_THEME.light.primary,
    onRightIconPress,
    className = "flex-row items-center w-full h-[55px] px-4 gap-3 rounded-2xl border transition-all duration-200",
    inputClassName = "text-lg h-full font-regular text-vertical text-foreground focus:outline-none placeholder:text-muted-foreground flex-1",
    autoCorrect = false,
    secureTextEntry = false,
    editable = true,
    helperText,
    ...textInputProps
}: InputProps<TFieldValues>) {
    const { colorScheme } = useColorScheme();

    return (
        <Controller
            name={name}
            control={control}
            rules={rules}
            render={({
                field: { value, onChange, onBlur },
                fieldState: { error },
            }) => (
                <>
                    <View
                        className={`${className} ${
                            error ? "border-red-500" : "border-muted"
                        } ${!editable ? "opacity-50 bg-muted" : ""}`}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        {leftIcon ? (
                            <Icon
                                name={leftIcon}
                                size={19}
                                color={NAV_THEME[colorScheme].foreground}
                            />
                        ) : null}
                        <TextInput
                            focusable={!editable}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder={placeholder}
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            autoCorrect={autoCorrect}
                            secureTextEntry={secureTextEntry}
                            editable={editable}
                            className={inputClassName}
                            style={{
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
                                    disabled={!editable}
                                    onPress={onRightIconPress}
                                    accessibilityRole="button"
                                    accessibilityLabel="Action"
                                    hitSlop={8}
                                >
                                    <Icon
                                        name={rightIcon}
                                        size={24}
                                        color={rightIconColor}
                                    />
                                </Pressable>
                            ) : (
                                <Icon
                                    name={rightIcon}
                                    size={24}
                                    color={rightIconColor}
                                />
                            )
                        ) : null}
                    </View>

                    {helperText && !error && (
                        <View className="mt-1 flex-row gap-1 items-start">
                            <Text className="text-sm text-muted-foreground/60">
                                {helperText}
                            </Text>
                        </View>
                    )}

                    <View
                        className={`mt-1 flex-row gap-1 items-center overflow-hidden transition-all duration-200
                ${
                    error
                        ? "opacity-100 translate-y-0 max-h-8"
                        : "opacity-0 -translate-y-1 max-h-0"
                }`}
                    >
                        <Icon name="CircleAlert" color="red" size={16} />
                        <Text className="text-sm font-medium text-red-500">
                            {error?.message}
                        </Text>
                    </View>
                </>
            )}
        />
    );
}
