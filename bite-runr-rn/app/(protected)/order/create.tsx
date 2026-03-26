import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MultiSelectSheet, SelectableItem } from "@/components/multi-select-sheet";
import { useFriends, useCreateOrder } from "@/lib/hooks/use-order-api";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

interface FieldErrors {
    name?: string;
    order_locations?: string;
    order_users?: string;
}

function parseReorderLocationNames(raw?: string) {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed
                .map((value) => (typeof value === "string" ? value.trim() : ""))
                .filter(Boolean);
        }
    } catch {
        // Fall back to the legacy comma-separated format.
    }

    return raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

export default function CreateOrder() {
    const { colorScheme } = useColorScheme();
    const { reorderName, reorderLocationNames, reorderFriendIds } =
        useLocalSearchParams<{
            reorderName?: string;
            reorderLocationNames?: string;
            reorderFriendIds?: string;
        }>();
    const isReorder = !!reorderName;
    const [name, setName] = useState(reorderName ?? "");
    const [comments, setComments] = useState("");
    const [locationInput, setLocationInput] = useState("");
    const [selectedLocationNames, setSelectedLocationNames] = useState<string[]>(
        () => parseReorderLocationNames(reorderLocationNames),
    );
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
        () => (reorderFriendIds ? reorderFriendIds.split(",").filter(Boolean) : []),
    );
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [showFriendsSheet, setShowFriendsSheet] = useState(false);

    const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
    const createOrderMutation = useCreateOrder();

    const friendItems: SelectableItem[] = useMemo(
        () =>
            friends.map((friend) => ({
                id: friend.id,
                displayName: `${friend.first_name} ${friend.last_name}`,
                avatarUrl: friend.avatar_url,
            })),
        [friends],
    );

    const selectedFriendsText =
        selectedFriendIds.length === 1
            ? "1 friend selected"
            : `${selectedFriendIds.length} friends selected`;

    const clearFieldError = (field: keyof FieldErrors) => {
        setFieldErrors((prev) => ({
            ...prev,
            [field]: undefined,
        }));
    };

    const addLocation = () => {
        const nextName = locationInput.trim();
        if (!nextName) return;

        const dedupeKey = nextName.toLowerCase();
        if (
            selectedLocationNames.some(
                (locationName) => locationName.toLowerCase() === dedupeKey,
            )
        ) {
            setLocationInput("");
            clearFieldError("order_locations");
            return;
        }

        setSelectedLocationNames((prev) => [...prev, nextName]);
        setLocationInput("");
        clearFieldError("order_locations");
    };

    const removeLocation = (locationName: string) => {
        setSelectedLocationNames((prev) =>
            prev.filter((value) => value !== locationName),
        );
    };

    const parseApiErrors = (error: any): FieldErrors => {
        const errors: FieldErrors = {};

        if (error?.error?.issues && Array.isArray(error.error.issues)) {
            error.error.issues.forEach((issue: any) => {
                if (issue.path && issue.path.length > 0) {
                    const fieldName = issue.path[0] as keyof FieldErrors;
                    errors[fieldName] = issue.message;
                }
            });
        }

        return errors;
    };

    const handleCreateOrder = async () => {
        setFieldErrors({});

        const trimmedName = name.trim();
        const normalizedLocationNames = selectedLocationNames
            .map((locationName) => locationName.trim())
            .filter(Boolean);

        const errors: FieldErrors = {};
        if (!trimmedName) {
            errors.name = "Name is required";
        }
        if (normalizedLocationNames.length === 0) {
            errors.order_locations = "At least one pickup location is required";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        try {
            const orderId = await createOrderMutation.mutateAsync({
                name: trimmedName,
                comments: comments.trim() || null,
                locationNames: normalizedLocationNames,
                friendIds: selectedFriendIds,
            });
            router.replace(`/(protected)/order/${orderId}`);
        } catch (error: any) {
            const apiErrors = parseApiErrors(error);
            if (Object.keys(apiErrors).length > 0) {
                setFieldErrors(apiErrors);
                return;
            }

            Alert.alert("Error", error?.message ?? "Failed to create order");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
            <View className="flex-row items-center px-4 py-3 border-b border-border">
                <Pressable
                    onPress={() => router.back()}
                    className="p-2 -ml-2 rounded-full active:opacity-70">
                    <Icon
                        name="ChevronLeft"
                        size={24}
                        color={NAV_THEME[colorScheme].primary}
                    />
                </Pressable>
                <Text className="flex-1 ml-2 text-xl font-bold text-foreground">
                    {isReorder ? "Reorder" : "Create Order"}
                </Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    keyboardDismissMode={
                        Platform.OS === "ios" ? "interactive" : "on-drag"
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View className="items-center p-6 mb-6 border rounded-2xl border-muted bg-card">
                        <View className="items-center justify-center w-16 h-16 mb-3 rounded-2xl bg-primary/10">
                            <Icon
                                name="ShoppingBag"
                                size={32}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        </View>
                        <Text className="text-lg font-semibold text-foreground">
                            {isReorder ? "Order Again" : "New Group Order"}
                        </Text>
                        <Text className="mt-1 text-sm text-center text-muted-foreground">
                            {isReorder
                                ? "Reuse the group and pickup spots, then update the details."
                                : "Add pickup locations for this order and invite your group."}
                        </Text>
                    </View>

                    <View className="gap-4">
                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                                    <Icon name="Tag" size={16} color="#3b82f6" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    Order Name
                                </Text>
                                <Text className="text-sm text-red-500">*</Text>
                            </View>
                            <Input
                                value={name}
                                placeholder="e.g., Friday Lunch Run"
                                errorMessage={fieldErrors.name ?? null}
                                onChangeText={(text) => {
                                    setName(text);
                                    if (fieldErrors.name) clearFieldError("name");
                                }}
                            />
                        </View>

                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-green-500/10">
                                    <Icon name="MapPin" size={16} color="#22c55e" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    Pickup Locations
                                </Text>
                                <Text className="text-sm text-red-500">*</Text>
                            </View>

                            <View className="gap-3">
                                <View className="flex-row items-center gap-2">
                                    <View className="flex-1">
                                        <Input
                                            value={locationInput}
                                            placeholder="Add a restaurant or pickup spot"
                                            errorMessage={fieldErrors.order_locations ?? null}
                                            onChangeText={(text) => {
                                                setLocationInput(text);
                                                if (fieldErrors.order_locations) {
                                                    clearFieldError("order_locations");
                                                }
                                            }}
                                            returnKeyType="done"
                                            onSubmitEditing={addLocation}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={addLocation}
                                        className="items-center justify-center h-[55px] px-4 rounded-xl bg-primary">
                                        <Icon name="Plus" size={18} color="white" />
                                    </TouchableOpacity>
                                </View>

                                <Text className="text-xs text-muted-foreground">
                                    These locations only exist for this order.
                                </Text>

                                {selectedLocationNames.length > 0 ? (
                                    <View className="flex-row flex-wrap gap-2">
                                        {selectedLocationNames.map((locationName) => (
                                            <View
                                                key={locationName}
                                                className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-green-500/10">
                                                <Icon
                                                    name="MapPin"
                                                    size={14}
                                                    color="#22c55e"
                                                />
                                                <Text className="text-sm font-medium text-foreground">
                                                    {locationName}
                                                </Text>
                                                <Pressable
                                                    onPress={() =>
                                                        removeLocation(locationName)
                                                    }>
                                                    <Icon
                                                        name="X"
                                                        size={14}
                                                        color="#22c55e"
                                                    />
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View className="items-center justify-center py-6 border border-dashed rounded-xl border-muted">
                                        <Text className="text-sm text-muted-foreground">
                                            Add at least one pickup location
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10">
                                    <Icon name="Users" size={16} color="#a855f7" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    Invite Friends
                                </Text>
                                <Text className="text-xs text-muted-foreground">
                                    (optional)
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => {
                                    setShowFriendsSheet(true);
                                    if (fieldErrors.order_users) {
                                        clearFieldError("order_users");
                                    }
                                }}
                                className={`flex-row items-center justify-between px-4 h-[55px] border rounded-xl bg-background ${
                                    fieldErrors.order_users
                                        ? "border-red-500"
                                        : "border-muted"
                                }`}>
                                <Text
                                    className={`text-base ${
                                        selectedFriendIds.length > 0
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                    }`}>
                                    {selectedFriendIds.length > 0
                                        ? selectedFriendsText
                                        : "Select friends to invite"}
                                </Text>
                                {selectedFriendIds.length > 0 ? (
                                    <View className="px-2.5 py-1 rounded-full bg-purple-500/10">
                                        <Text className="text-xs font-semibold text-purple-500">
                                            {selectedFriendIds.length}
                                        </Text>
                                    </View>
                                ) : (
                                    <Icon
                                        name="ChevronRight"
                                        size={20}
                                        color={NAV_THEME[colorScheme].border}
                                    />
                                )}
                            </Pressable>
                        </View>

                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10">
                                    <Icon name="MessageSquare" size={16} color="#f97316" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    Notes
                                </Text>
                                <Text className="text-xs text-muted-foreground">
                                    (optional)
                                </Text>
                            </View>
                            <View className="px-4 border rounded-xl border-muted bg-background">
                                <TextInput
                                    className="py-3.5 text-base text-foreground"
                                    placeholder="Add any notes or timing details..."
                                    placeholderTextColor={NAV_THEME[colorScheme].border}
                                    value={comments}
                                    onChangeText={setComments}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    style={{ minHeight: 80 }}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleCreateOrder}
                        disabled={createOrderMutation.isPending}
                        className={`flex-row items-center justify-center gap-2 py-4 mt-6 rounded-xl ${
                            createOrderMutation.isPending
                                ? "bg-primary/50"
                                : "bg-primary"
                        }`}>
                        {createOrderMutation.isPending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Icon name="Plus" size={20} color="white" />
                                <Text className="text-base font-semibold text-white">
                                    Create Order
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <MultiSelectSheet
                visible={showFriendsSheet}
                onClose={() => setShowFriendsSheet(false)}
                onConfirm={setSelectedFriendIds}
                items={friendItems}
                selectedIds={selectedFriendIds}
                title="Select Friends"
                isLoading={isLoadingFriends}
            />
        </SafeAreaView>
    );
}
