import React, { useState, useEffect } from "react";
import { View, Text, Modal, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/common/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";

type EnterCodeModalProps = {
    visible: boolean;
    onSubmit: (code: string) => void;
    onClose: () => void;
};

export function EnterCodeModal({
    visible,
    onSubmit,
    onClose,
}: EnterCodeModalProps) {
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();
    const [code, setCode] = useState("");

    useEffect(() => {
        if (visible) {
            setCode("");
        }
    }, [visible]);

    const handleSubmit = () => {
        const trimmed = code.trim().toUpperCase();
        if (trimmed.length > 0) {
            onSubmit(trimmed);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            statusBarTranslucent
            onRequestClose={onClose}>
            <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                    <Pressable
                        onPress={onClose}
                        className="p-2 -ml-2 rounded-full active:opacity-70">
                        <Icon
                            name="ChevronLeft"
                            size={24}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </Pressable>
                    <Text className="text-lg font-semibold text-foreground">
                        Enter Invite Code
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View className="px-6 pt-8">
                    <Text className="text-sm text-muted-foreground text-center mb-6">
                        Enter the 8-character code shared with you to join an
                        order.
                    </Text>

                    <TextInput
                        value={code}
                        onChangeText={(text) => setCode(text.toUpperCase())}
                        placeholder="AB2CDEFG"
                        placeholderTextColor={NAV_THEME[colorScheme].border}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoFocus
                        maxLength={8}
                        returnKeyType="go"
                        onSubmitEditing={handleSubmit}
                        className="bg-muted rounded-xl px-4 py-4 text-foreground text-center text-2xl font-bold tracking-widest mb-6"
                        style={{ letterSpacing: 6 }}
                    />

                    <Pressable
                        onPress={handleSubmit}
                        disabled={code.trim().length === 0}
                        className={`py-4 rounded-xl items-center ${
                            code.trim().length > 0 ? "bg-primary" : "bg-muted"
                        } active:opacity-80`}>
                        <Text
                            className={`font-semibold text-base ${
                                code.trim().length > 0
                                    ? "text-white"
                                    : "text-muted-foreground"
                            }`}>
                            Join Order
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
