import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    Pressable,
} from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface EditItemSheetProps {
    visible: boolean;
    onClose: () => void;
    onUpdate: () => void;
    onDelete: () => void;
    itemName: string;
    locationName: string;
    orderItemId: string;
    initialQuantity: number;
    initialComments: string | null;
}

export function EditItemSheet({
    visible,
    onClose,
    onUpdate,
    onDelete,
    itemName,
    locationName,
    orderItemId,
    initialQuantity,
    initialComments,
}: EditItemSheetProps) {
    const actionSheetRef = useRef<ActionSheetRef>(null);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [comments, setComments] = useState(initialComments || "");
    const { colorScheme } = useColorScheme();

    const updateItem = useMutation(api.orderItems.update);

    useEffect(() => {
        if (visible) {
            // Reset to initial values when sheet opens
            setQuantity(initialQuantity);
            setComments(initialComments || "");
            actionSheetRef.current?.show();
        } else {
            actionSheetRef.current?.hide();
        }
    }, [visible, initialQuantity, initialComments]);

    const handleUpdate = async () => {
        try {
            await updateItem({
                orderItemId: orderItemId as Id<"orderItems">,
                comments: comments || undefined,
                quantity,
            });
            actionSheetRef.current?.hide();
            onUpdate();
        } catch (error) {
            console.error("Error updating item:", error);
        }
    };

    const handleClose = () => {
        onClose();
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Item",
            `Are you sure you want to remove ${itemName} from your order?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        actionSheetRef.current?.hide();
                        onDelete();
                    },
                },
            ]
        );
    };

    const incrementQuantity = () => {
        setQuantity((prev) => prev + 1);
    };

    const decrementQuantity = () => {
        setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
    };

    return (
        <ActionSheet
            ref={actionSheetRef}
            containerStyle={{
                backgroundColor: colorScheme === "dark" ? "hsl(0, 0%, 7%)" : "hsl(0, 0%, 96%)",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: "75%",
            }}
            gestureEnabled={true}
            onClose={handleClose}
            defaultOverlayOpacity={0.3}
            useBottomSafeAreaPadding={true}>
            <View className="flex-1">
                {/* Header */}
                <View className="flex-row items-start justify-between px-4 pt-4 pb-3 border-b border-border">
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-foreground">
                            {itemName}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                            From {locationName}
                        </Text>
                    </View>
                    <Pressable
                        onPress={handleDelete}
                        className="items-center justify-center w-10 h-10 rounded-full bg-destructive/10 active:opacity-70">
                        <Icon name="Trash2" size={18} color="hsl(0, 84%, 60%)" />
                    </Pressable>
                </View>

                {/* Content */}
                <View className="flex-1 px-4 pt-6">
                    {/* Quantity Selector */}
                    <View className="mb-6">
                        <Text className="mb-2 text-base font-semibold text-foreground">
                            Quantity
                        </Text>
                        <View className="flex-row items-center gap-4">
                            <TouchableOpacity
                                onPress={decrementQuantity}
                                className="items-center justify-center w-12 h-12 rounded-full bg-muted">
                                <Text className="text-2xl text-foreground">
                                    -
                                </Text>
                            </TouchableOpacity>
                            <View className="items-center justify-center flex-1 h-12 border rounded-xl border-input bg-background">
                                <Text className="text-xl font-semibold text-foreground">
                                    {quantity}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={incrementQuantity}
                                className="items-center justify-center w-12 h-12 rounded-full bg-muted">
                                <Text className="text-2xl text-foreground">
                                    +
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Comments */}
                    <View className="mb-6">
                        <Text className="mb-2 text-base font-semibold text-foreground">
                            Comments (Optional)
                        </Text>
                        <TextInput
                            className="px-4 py-3 border rounded-xl border-input bg-background text-foreground"
                            placeholder="Add any special instructions..."
                            placeholderTextColor="hsl(215.4 16.3% 46.9%)"
                            value={comments}
                            onChangeText={setComments}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            style={{ minHeight: 100 }}
                        />
                    </View>
                </View>

                {/* Footer - Fixed at bottom */}
                <View className="px-4 py-3 border-t border-border">
                    <View className="flex-col gap-2">
                        <Button label="Update Item" onPress={handleUpdate} />
                        <Button label="Cancel" variant="outline" onPress={handleClose} />
                    </View>
                </View>
            </View>
        </ActionSheet>
    );
}
