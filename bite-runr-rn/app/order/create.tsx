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
} from "react-native";
import { PageWithHeader } from "@/components/page-with-header";
import {
    MultiSelectSheet,
    SelectableItem,
} from "@/components/multi-select-sheet";
import {
    useLocations,
    useFriends,
    useCreateOrder,
} from "@/lib/hooks/use-order-api";
import { router } from "expo-router";

interface FieldErrors {
    name?: string;
    order_locations?: string;
    order_users?: string;
}

export default function CreateOrder() {
    const [name, setName] = useState("");
    const [comments, setComments] = useState("");
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
        []
    );
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
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

        if (selectedFriendIds.length === 0) {
            errors.order_users = "At least one friend is required";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        try {
            await createOrderMutation.mutateAsync({
                name: name.trim(),
                comments: comments.trim() || null,
                locationIds: selectedLocationIds,
                friendIds: selectedFriendIds,
            });

            Alert.alert("Success", "Order created successfully!", [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]);
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
        <PageWithHeader
            title="Create Order"
            logoSource={require("@/assets/images/app-logo.png")}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1">
                <ScrollView className="flex-1 px-6 py-4">
                    {/* Name Field */}
                    <View className="mb-4">
                        <Text className="mb-2 text-sm font-medium text-foreground">
                            Order Name *
                        </Text>
                        <View
                            className={`flex-row items-center px-3 border rounded-lg bg-background ${
                                fieldErrors.name
                                    ? "border-red-500"
                                    : "border-input"
                            }`}>
                            <TextInput
                                className="flex-1 py-3 text-foreground"
                                placeholder="Name"
                                placeholderTextColor="hsl(215.4 16.3% 46.9%)"
                                value={name}
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
                        {fieldErrors.name && (
                            <Text className="mt-1 text-xs text-red-500">
                                {fieldErrors.name}
                            </Text>
                        )}
                    </View>

                    {/* Locations Field */}
                    <View className="mb-4">
                        <Text className="mb-2 text-sm font-medium text-foreground">
                            Locations *
                        </Text>
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
                            className={`px-3 py-3 border rounded-lg bg-background ${
                                fieldErrors.order_locations
                                    ? "border-red-500"
                                    : "border-input"
                            }`}>
                            <Text
                                className={
                                    selectedLocationIds.length > 0
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                }>
                                {selectedLocationIds.length > 0
                                    ? selectedLocationsText
                                    : "Select locations"}
                            </Text>
                        </Pressable>
                        {fieldErrors.order_locations && (
                            <Text className="mt-1 text-xs text-red-500">
                                {fieldErrors.order_locations}
                            </Text>
                        )}
                    </View>

                    {/* Friends Field */}
                    <View className="mb-4">
                        <Text className="mb-2 text-sm font-medium text-foreground">
                            Friends *
                        </Text>
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
                            className={`px-3 py-3 border rounded-lg bg-background ${
                                fieldErrors.order_users
                                    ? "border-red-500"
                                    : "border-input"
                            }`}>
                            <Text
                                className={
                                    selectedFriendIds.length > 0
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                }>
                                {selectedFriendIds.length > 0
                                    ? selectedFriendsText
                                    : "Select friends"}
                            </Text>
                        </Pressable>
                        {fieldErrors.order_users && (
                            <Text className="mt-1 text-xs text-red-500">
                                {fieldErrors.order_users}
                            </Text>
                        )}
                    </View>

                    {/* Comments Field */}
                    <View className="mb-6">
                        <Text className="mb-2 text-sm font-medium text-foreground">
                            Comments
                        </Text>
                        <View className="px-3 border rounded-lg border-input bg-background">
                            <TextInput
                                className="py-3 text-foreground"
                                placeholder="Add any notes or comments..."
                                placeholderTextColor="hsl(215.4 16.3% 46.9%)"
                                value={comments}
                                onChangeText={setComments}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <Pressable
                        onPress={handleCreateOrder}
                        disabled={createOrderMutation.isPending}
                        className={`rounded-lg px-4 py-3 ${
                            createOrderMutation.isPending
                                ? "bg-primary/50"
                                : "bg-primary"
                        }`}>
                        <View className="flex-row items-center justify-center">
                            {createOrderMutation.isPending && (
                                <ActivityIndicator
                                    color="#fff"
                                    className="mr-2"
                                />
                            )}
                            <Text className="font-semibold text-white">
                                Create Order
                            </Text>
                        </View>
                    </Pressable>
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
        </PageWithHeader>
    );
}
