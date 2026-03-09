import { useState } from "react";
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    View,
    Pressable,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    MultiSelectSheet,
    SelectableItem,
} from "@/components/multi-select-sheet";
import {
    useLocations,
    useFriends,
    useCreateOrder,
} from "@/lib/hooks/use-order-api";
import { router, useLocalSearchParams } from "expo-router";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

interface FieldErrors {
    name?: string;
    order_locations?: string;
    order_users?: string;
}

export default function CreateOrder() {
    const { colorScheme } = useColorScheme();
    const { reorderName, reorderLocationIds, reorderFriendIds } =
        useLocalSearchParams<{
            reorderName?: string;
            reorderLocationIds?: string;
            reorderFriendIds?: string;
        }>();
    const isReorder = !!reorderName;
    const [name, setName] = useState(reorderName ?? "");
    const [comments, setComments] = useState("");
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
        reorderLocationIds ? reorderLocationIds.split(",") : []
    );
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
        reorderFriendIds ? reorderFriendIds.split(",") : []
    );
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const [showLocationsSheet, setShowLocationsSheet] = useState(false);
    const [showFriendsSheet, setShowFriendsSheet] = useState(false);

    const { data: locations = [], isLoading: isLoadingLocations } =
        useLocations();
    const { data: friends = [], isLoading: isLoadingFriends } = useFriends();
    const createOrderMutation = useCreateOrder();

    const locationItems: SelectableItem[] = locations.map((loc) => ({
        id: loc.id,
        displayName: loc.name,
    }));

    const friendItems: SelectableItem[] = friends.map((friend) => ({
        id: friend.id,
        displayName: `${friend.first_name} ${friend.last_name}`,
        avatarUrl: friend.avatar_url,
    }));

    const selectedLocationsText =
        selectedLocationIds.length === 1
            ? "1 location selected"
            : `${selectedLocationIds.length} locations selected`;

    const selectedFriendsText =
        selectedFriendIds.length === 1
            ? "1 friend selected"
            : `${selectedFriendIds.length} friends selected`;

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

        const errors: FieldErrors = {};

        if (!name.trim()) {
            errors.name = "Name is required";
        }

        if (selectedLocationIds.length === 0) {
            errors.order_locations = "At least one location required";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        try {
            const orderId = await createOrderMutation.mutateAsync({
                name: name.trim(),
                comments: comments.trim() || null,
                locationIds: selectedLocationIds,
                friendIds: selectedFriendIds,
            });
            router.replace(`/(protected)/order/${orderId}`);
        } catch (error: any) {
            const apiErrors = parseApiErrors(error);

            if (Object.keys(apiErrors).length > 0) {
                setFieldErrors(apiErrors);
            } else {
                Alert.alert(
                    "Error",
                    error?.message ?? "Failed to create order"
                );
            }
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
            {/* Header */}
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
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {/* Header Card */}
                    <View className="items-center p-6 mb-6 border rounded-2xl border-muted bg-card">
                        <View className="items-center justify-center w-16 h-16 mb-3 rounded-2xl bg-primary/10">
                            <Icon
                                name="ShoppingBag"
                                size={32}
                                color={NAV_THEME[colorScheme].primary}
                            />
                        </View>
                        <Text className="text-lg font-semibold text-foreground">
                            {isReorder
                                ? "Order Again"
                                : "New Group Order"}
                        </Text>
                        <Text className="mt-1 text-sm text-center text-muted-foreground">
                            {isReorder
                                ? "Tweak the details and start a new order"
                                : "Set up your order details below"}
                        </Text>
                    </View>

                    {/* Form Fields */}
                    <View className="gap-4">
                        {/* Name Field */}
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
                                    if (fieldErrors.name) {
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            name: undefined,
                                        }));
                                    }
                                }}
                            />
                        </View>

                        {/* Locations Field */}
                        <View className="p-4 border rounded-xl border-muted bg-card">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="items-center justify-center w-8 h-8 rounded-lg bg-green-500/10">
                                    <Icon name="MapPin" size={16} color="#22c55e" />
                                </View>
                                <Text className="text-sm font-medium text-muted-foreground">
                                    Locations
                                </Text>
                                <Text className="text-sm text-red-500">*</Text>
                            </View>
                            <Pressable
                                onPress={() => {
                                    setShowLocationsSheet(true);
                                    if (fieldErrors.order_locations) {
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            order_locations: undefined,
                                        }));
                                    }
                                }}
                                className={`flex-row items-center justify-between px-4 h-[55px] border rounded-xl bg-background ${
                                    fieldErrors.order_locations
                                        ? "border-red-500"
                                        : "border-muted"
                                }`}>
                                <Text
                                    className={`text-base ${
                                        selectedLocationIds.length > 0
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                    }`}>
                                    {selectedLocationIds.length > 0
                                        ? selectedLocationsText
                                        : "Select restaurants"}
                                </Text>
                                {selectedLocationIds.length > 0 ? (
                                    <View className="px-2.5 py-1 rounded-full bg-green-500/10">
                                        <Text className="text-xs font-semibold text-green-500">
                                            {selectedLocationIds.length}
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
                            {fieldErrors.order_locations && (
                                <View className="flex-row items-center gap-1 mt-2">
                                    <Icon name="CircleAlert" size={12} color="#ef4444" />
                                    <Text className="text-xs text-red-500">
                                        {fieldErrors.order_locations}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Friends Field */}
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
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            order_users: undefined,
                                        }));
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
                            {fieldErrors.order_users && (
                                <View className="flex-row items-center gap-1 mt-2">
                                    <Icon name="CircleAlert" size={12} color="#ef4444" />
                                    <Text className="text-xs text-red-500">
                                        {fieldErrors.order_users}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Comments Field */}
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
                                    placeholder="Add any notes or special instructions..."
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

                    {/* Submit Button */}
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

            {/* Location Selection Sheet */}
            <MultiSelectSheet
                visible={showLocationsSheet}
                onClose={() => setShowLocationsSheet(false)}
                onConfirm={setSelectedLocationIds}
                items={locationItems}
                selectedIds={selectedLocationIds}
                title="Select Locations"
                isLoading={isLoadingLocations}
            />

            {/* Friends Selection Sheet */}
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
