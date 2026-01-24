import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    FlatList,
    ActivityIndicator,
    Image,
} from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";

export interface SelectableItem {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
}

interface MultiSelectSheetProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
    items: SelectableItem[];
    selectedIds: string[];
    title: string;
    isLoading?: boolean;
}

export function MultiSelectSheet({
    visible,
    onClose,
    onConfirm,
    items,
    selectedIds,
    title,
    isLoading = false,
}: MultiSelectSheetProps) {
    const actionSheetRef = useRef<ActionSheetRef>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [localSelectedIds, setLocalSelectedIds] =
        useState<string[]>(selectedIds);
    const { colorScheme } = useColorScheme();

    useEffect(() => {
        if (visible) {
            actionSheetRef.current?.show();
        } else {
            actionSheetRef.current?.hide();
        }
    }, [visible]);

    useEffect(() => {
        setLocalSelectedIds(selectedIds);
    }, [selectedIds]);

    const filteredItems = items.filter((item) =>
        item.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelection = (id: string) => {
        setLocalSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((itemId) => itemId !== id)
                : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onConfirm(localSelectedIds);
        actionSheetRef.current?.hide();
    };

    const handleClose = () => {
        setLocalSelectedIds(selectedIds);
        setSearchQuery("");
        onClose();
    };

    return (
        <ActionSheet
            ref={actionSheetRef}
            containerStyle={{
                backgroundColor: NAV_THEME[colorScheme].background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: "90%",
            }}
            gestureEnabled={true}
            onClose={handleClose}
            defaultOverlayOpacity={0.3}
            useBottomSafeAreaPadding={true}>
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-xl font-bold text-foreground">
                            {title}
                        </Text>
                    </View>

                    {/* Search bar */}
                    <View className="flex-row items-center px-3 border rounded-lg border-input bg-background">
                        <TextInput
                            className="flex-1 py-2 text-foreground"
                            placeholder="Search..."
                            placeholderTextColor="hsl(215.4 16.3% 46.9%)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* List */}
                {isLoading ? (
                    <View className="items-center justify-center flex-1">
                        <ActivityIndicator
                            size="large"
                            color="hsl(32 100% 50%)"
                        />
                    </View>
                ) : (
                    <FlatList
                        data={filteredItems}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ flexGrow: 1 }}
                        renderItem={({ item }) => {
                            const isSelected = localSelectedIds.includes(
                                item.id
                            );
                            return (
                                <Pressable
                                    onPress={() => toggleSelection(item.id)}
                                    className="px-4 py-4 border-b border-border">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center flex-1">
                                            {item.avatarUrl ? (
                                                <Image
                                                    source={{
                                                        uri: item.avatarUrl,
                                                    }}
                                                    className="w-10 h-10 mr-3 rounded-full"
                                                />
                                            ) : item.avatarUrl === null ? (
                                                <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-muted">
                                                    <Text
                                                        style={{ fontSize: 16 }}
                                                        className="font-semibold text-muted-foreground">
                                                        {(() => {
                                                            const parts = item.displayName.trim().split(/\s+/);
                                                            const first = parts[0] || "";
                                                            const last = parts.length > 1 ? parts[parts.length - 1] : "";
                                                            return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "U";
                                                        })()}
                                                    </Text>
                                                </View>
                                            ) : null}
                                            <Text className="text-base text-foreground">
                                                {item.displayName}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <View className="items-center justify-center w-6 h-6 rounded-full bg-primary">
                                                <Text className="font-bold text-white">
                                                    ✓
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </Pressable>
                            );
                        }}
                        ListEmptyComponent={
                            <View className="px-4 py-8">
                                <Text className="text-center text-muted-foreground">
                                    No items found
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Footer - Fixed at bottom */}
                <View className="px-4 py-3 border-t border-border bg-background">
                    <Pressable
                        onPress={handleConfirm}
                        className="px-4 py-3 rounded-lg bg-primary">
                        <Text className="font-semibold text-center text-white">
                            Confirm ({localSelectedIds.length} selected)
                        </Text>
                    </Pressable>
                </View>
            </View>
        </ActionSheet>
    );
}
