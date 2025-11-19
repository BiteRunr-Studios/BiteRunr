import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    Pressable,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface SelectableItem {
    id: string;
    displayName: string;
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
    const [searchQuery, setSearchQuery] = useState("");
    const [localSelectedIds, setLocalSelectedIds] =
        useState<string[]>(selectedIds);

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
        onClose();
    };

    const handleClose = () => {
        setLocalSelectedIds(selectedIds);
        setSearchQuery("");
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}>
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1">
                    {/* Header */}
                    <View className="px-4 pt-10 pb-3 border-b border-border">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xl font-bold text-foreground">
                                {title}
                            </Text>
                            <Pressable onPress={handleClose}>
                                <Text className="font-semibold text-primary">
                                    Cancel
                                </Text>
                            </Pressable>
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
                            renderItem={({ item }) => {
                                const isSelected = localSelectedIds.includes(
                                    item.id
                                );
                                return (
                                    <Pressable
                                        onPress={() => toggleSelection(item.id)}
                                        className="px-4 py-4 border-b border-border">
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-base text-foreground">
                                                {item.displayName}
                                            </Text>
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

                    {/* Footer */}
                    <View className="px-4 py-3 border-t border-border">
                        <Pressable
                            onPress={handleConfirm}
                            className="px-4 py-3 rounded-lg bg-primary">
                            <Text className="font-semibold text-center text-white">
                                Confirm ({localSelectedIds.length} selected)
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
