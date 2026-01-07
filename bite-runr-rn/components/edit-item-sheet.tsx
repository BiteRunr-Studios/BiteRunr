import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    TouchableOpacity,
} from "react-native";
import ActionSheet, { ActionSheetRef } from "react-native-actions-sheet";
import { updateOrderItem } from "@/api/order/updateOrderItem";

interface EditItemSheetProps {
    visible: boolean;
    onClose: () => void;
    onUpdate: () => void;
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
    itemName,
    locationName,
    orderItemId,
    initialQuantity,
    initialComments,
}: EditItemSheetProps) {
    const actionSheetRef = useRef<ActionSheetRef>(null);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [comments, setComments] = useState(initialComments || "");

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
            await updateOrderItem({
                order_item_id: orderItemId,
                comments: comments || null,
                quantity,
            });
            actionSheetRef.current?.hide();
            onUpdate();
        } catch (error) {
            console.error("Error updating item:", error);
            // Optionally show an error message to the user
        }
    };

    const handleClose = () => {
        onClose();
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
                backgroundColor: "hsl(0 0% 100%)",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: "75%",
            }}
            gestureEnabled={true}
            onClose={handleClose}
            defaultOverlayOpacity={0.3}
            useBottomSafeAreaPadding={true}>
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <Text className="text-xl font-bold text-foreground">
                        {itemName}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                        From {locationName}
                    </Text>
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
                            <View className="items-center justify-center flex-1 h-12 border rounded-lg border-input bg-background">
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
                            className="p-3 border rounded-lg border-input bg-background text-foreground"
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
                <View className="px-4 py-3 border-t border-border bg-background">
                    <View className="flex-col gap-2">
                        <TouchableOpacity
                            onPress={handleUpdate}
                            className="w-full py-3 rounded-lg bg-primary">
                            <Text className="text-base font-semibold text-center text-white">
                                Update Item
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleClose}
                            className="w-full py-3 border rounded-lg border-input bg-background">
                            <Text className="text-base font-semibold text-center text-foreground">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ActionSheet>
    );
}
