import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { groupOrderItemsByParticipant } from "@/lib/order-item-grouping";

interface OrderItem {
    id: string;
    orderUserId: string;
    itemName: string;
    quantity: number;
    userName: string;
    priceInCents: number | null;
}

interface ManualPriceEntrySheetProps {
    visible: boolean;
    onDismiss: () => void;
    onSave: () => void;
    orderItems: OrderItem[] | null;
    prices: Map<string, number | null>;
    onUpdatePrice: (orderItemId: string, priceInCents: number | null) => void;
    locationName: string;
    isSaving: boolean;
}

function formatPrice(cents: number | null): string {
    if (cents === null) return "";
    return (cents / 100).toFixed(2);
}

function PriceItemCard({
    orderItem,
    priceInCents,
    onUpdatePrice,
    colorScheme,
}: {
    orderItem: OrderItem;
    priceInCents: number | null;
    onUpdatePrice: (orderItemId: string, priceInCents: number | null) => void;
    colorScheme: "light" | "dark";
}) {
    const [localPrice, setLocalPrice] = useState(() => {
        if (priceInCents !== null) return formatPrice(priceInCents);
        return "";
    });

    const handlePriceChange = (text: string) => {
        let cleaned = text.replace(/[^0-9.]/g, "");
        const decimalIndex = cleaned.indexOf(".");
        if (decimalIndex !== -1) {
            cleaned =
                cleaned.slice(0, decimalIndex + 1) +
                cleaned.slice(decimalIndex + 1).replace(/\./g, "");
        }
        setLocalPrice(cleaned);

        const value = parseFloat(cleaned);
        if (!isNaN(value)) {
            onUpdatePrice(orderItem.id, Math.round(value * 100));
        } else if (cleaned === "") {
            onUpdatePrice(orderItem.id, null);
        }
    };

    const hasPrice = priceInCents !== null && priceInCents > 0;

    return (
        <View
            className={`mb-2 overflow-hidden border rounded-xl ${
                hasPrice ? "border-green-500/30 bg-green-500/5" : "border-border bg-card"
            }`}
        >
            <View className="p-3">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1 gap-2">
                        {hasPrice ? (
                            <View className="items-center justify-center w-6 h-6 rounded-full bg-green-500/20">
                                <Icon name="Check" size={14} color="#22c55e" />
                            </View>
                        ) : (
                            <View className="items-center justify-center w-6 h-6 border border-dashed rounded-full border-muted-foreground/30" />
                        )}
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-foreground">
                                {orderItem.itemName}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                                Qty: {orderItem.quantity}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row items-center ml-8 h-9 px-2.5 border rounded-lg border-input bg-background">
                    <Text className="text-sm text-muted-foreground">$</Text>
                    <TextInput
                        className="flex-1 px-1 text-sm text-foreground"
                        placeholder={
                            orderItem.priceInCents !== null
                                ? formatPrice(orderItem.priceInCents)
                                : "0.00"
                        }
                        placeholderTextColor={NAV_THEME[colorScheme].border}
                        value={localPrice}
                        onChangeText={handlePriceChange}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>
        </View>
    );
}

function SectionHeader({
    title,
    pricedCount,
    totalCount,
}: {
    title: string;
    pricedCount: number;
    totalCount: number;
}) {
    return (
        <View className="flex-row items-center gap-2 mt-4 mb-2">
            <Text className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {title}
            </Text>
            <View className="px-1.5 min-w-[20px] h-5 rounded-full bg-muted items-center justify-center">
                <Text className="text-[10px] font-bold text-muted-foreground">
                    {pricedCount}/{totalCount}
                </Text>
            </View>
            <View className="flex-1 h-px bg-border" />
        </View>
    );
}

export function ManualPriceEntrySheet({
    visible,
    onDismiss,
    onSave,
    orderItems,
    prices,
    onUpdatePrice,
    locationName,
    isSaving,
}: ManualPriceEntrySheetProps) {
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();

    const personGroups = useMemo(
        () => groupOrderItemsByParticipant(orderItems),
        [orderItems],
    );

    const totalItems = orderItems?.length ?? 0;
    const pricedCount = orderItems
        ? orderItems.filter((oi) => {
              const price = prices.get(oi.id);
              return price !== null && price !== undefined && price > 0;
          }).length
        : 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <View
                className="flex-1"
                style={{
                    backgroundColor:
                        colorScheme === "dark"
                            ? "hsl(0, 0%, 7%)"
                            : "hsl(0, 0%, 96%)",
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                }}
            >
                {/* Header */}
                <View className="px-4 pt-4 pb-3 border-b border-border">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-foreground">
                                Enter Prices
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                                {locationName}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onDismiss}
                            className="items-center justify-center w-8 h-8 rounded-full bg-muted"
                        >
                            <Icon
                                name="X"
                                size={18}
                                color={NAV_THEME[colorScheme].text}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Body */}
                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {personGroups.map(({ key, displayName, items }) => {
                        const groupPriced = items.filter((oi) => {
                            const price = prices.get(oi.id);
                            return price !== null && price !== undefined && price > 0;
                        }).length;

                        return (
                            <React.Fragment key={key}>
                                <SectionHeader
                                    title={displayName}
                                    pricedCount={groupPriced}
                                    totalCount={items.length}
                                />
                                {items.map((oi) => (
                                    <PriceItemCard
                                        key={oi.id}
                                        orderItem={oi}
                                        priceInCents={prices.get(oi.id) ?? null}
                                        onUpdatePrice={onUpdatePrice}
                                        colorScheme={colorScheme}
                                    />
                                ))}
                            </React.Fragment>
                        );
                    })}
                </ScrollView>

                {/* Footer */}
                <View className="px-4 py-3 border-t border-border">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm text-muted-foreground">
                            {pricedCount} of {totalItems} priced
                        </Text>
                    </View>
                    <Button
                        label={
                            isSaving
                                ? "Saving..."
                                : `Save ${pricedCount} Price${pricedCount !== 1 ? "s" : ""}`
                        }
                        onPress={onSave}
                        disabled={isSaving || pricedCount === 0}
                        loading={isSaving}
                    />
                </View>
            </View>
        </Modal>
    );
}
