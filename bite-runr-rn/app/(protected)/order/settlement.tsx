import {
    ScrollView,
    Text,
    View,
    Image,
    TouchableOpacity,
    Alert,
    Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";
import Icon from "@/components/common/icon";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { openPaypalLink } from "@/lib/payment-links";

export default function SettlementScreen() {
    const { orderId } = useLocalSearchParams();
    const { colorScheme } = useColorScheme();

    const currentUser = useQuery(api.users.getCurrentUser);
    const currentUserId = currentUser?._id;

    const data = useQuery(
        api.orders.get,
        orderId ? { orderId: orderId as Id<"orders"> } : "skip",
    );

    const claimPayment = useMutation(api.orderUsers.claimPayment);
    const confirmPayment = useMutation(api.orderUsers.confirmPayment);
    const updateOrder = useMutation(api.orders.update);

    const isCreator = currentUserId === data?.order.creatorId;

    const nonCreatorUsers =
        data?.orderUsers.filter((ou) => !ou.isCreator) ?? [];

    const myOrderUser = data?.orderUsers.find(
        (ou) => ou.userId === currentUserId,
    );

    const creatorUser = data?.orderUsers.find((ou) => ou.isCreator);
    const creatorName = creatorUser?.user
        ? `${creatorUser.user.firstName} ${creatorUser.user.lastName}`.trim()
        : "the runner";

    const confirmedCount = nonCreatorUsers.filter(
        (ou) => ou.settlementStatus === "confirmed",
    ).length;

    const totalOwed = nonCreatorUsers.reduce(
        (sum, ou) => sum + Number(ou.amountOwed),
        0,
    );

    const allConfirmed =
        nonCreatorUsers.length > 0 &&
        nonCreatorUsers.every((ou) => ou.settlementStatus === "confirmed");

    async function handleClaimPayment() {
        try {
            await claimPayment({ orderId: orderId as Id<"orders"> });
        } catch (error: any) {
            Alert.alert("Error", error?.message ?? "Failed to claim payment");
        }
    }

    async function handleConfirmPayment(orderUserId: Id<"orderUsers">) {
        try {
            await confirmPayment({ orderUserId });
        } catch (error: any) {
            Alert.alert("Error", error?.message ?? "Failed to confirm payment");
        }
    }

    async function handleCompleteOrder() {
        try {
            await updateOrder({
                orderId: orderId as Id<"orders">,
                status: "completed",
            });
            router.dismissAll();
        } catch (error: any) {
            Alert.alert(
                "Error",
                error?.message ?? "Failed to complete order",
            );
        }
    }

    async function handlePayViaPaypal() {
        if (!data?.order.creatorPaypalMe || !myOrderUser) return;

        const success = await openPaypalLink(
            data.order.creatorPaypalMe,
            myOrderUser.amountOwed,
            `BiteRunr - ${data.order.name}`,
        );

        if (!success) {
            Alert.alert(
                "Error",
                "Could not open PayPal. Please try paying manually.",
            );
        }
    }

    if (data === undefined) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <Text className="text-foreground">Loading...</Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View className="items-center justify-center flex-1 px-6">
                <Text className="text-destructive">Order not found</Text>
            </View>
        );
    }

    return (
        <>
            <SafeAreaView edges={["top"]} />
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
                <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                    Payments
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Order Info */}
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-sm text-muted-foreground">
                        {data.order.name}
                    </Text>
                    {isCreator && (
                        <Text className="mt-1 text-sm text-muted-foreground">
                            {confirmedCount} of {nonCreatorUsers.length} paid
                            {" · "}Total: ${(totalOwed / 100).toFixed(2)}
                        </Text>
                    )}
                </View>

                {isCreator ? (
                    /* Creator/Runner view */
                    <View className="gap-3 px-4 mt-2">
                        {nonCreatorUsers.map((ou) => {
                            const amount = (
                                Number(ou.amountOwed) / 100
                            ).toFixed(2);
                            const name = ou.user
                                ? `${ou.user.firstName} ${ou.user.lastName}`.trim()
                                : "Unknown";
                            const initials = ou.user
                                ? `${(ou.user.firstName || "").charAt(0)}${(ou.user.lastName || "").charAt(0)}`.toUpperCase()
                                : "U";

                            return (
                                <View
                                    key={ou.id}
                                    className="p-4 border rounded-xl border-muted bg-card">
                                    <View className="flex-row items-center">
                                        {/* Avatar */}
                                        {ou.user?.avatarUrl ? (
                                            <Image
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                }}
                                                className="rounded-full"
                                                source={{
                                                    uri: ou.user.avatarUrl,
                                                }}
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                }}
                                                className="items-center justify-center rounded-full bg-muted">
                                                <Text className="font-semibold text-muted-foreground">
                                                    {initials}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Name and amount */}
                                        <View className="flex-1 ml-3">
                                            <Text className="text-base font-medium text-foreground">
                                                {name}
                                            </Text>
                                            <Text className="mt-0.5 text-lg font-bold text-foreground">
                                                ${amount}
                                            </Text>
                                        </View>

                                        {/* Status */}
                                        {ou.settlementStatus === "unpaid" && (
                                            <View className="px-3 py-1.5 rounded-full bg-yellow-500/10">
                                                <Text className="text-xs font-medium text-yellow-600">
                                                    Unpaid
                                                </Text>
                                            </View>
                                        )}
                                        {ou.settlementStatus === "confirmed" && (
                                            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10">
                                                <Icon
                                                    name="CircleCheck"
                                                    size={14}
                                                    color="#22c55e"
                                                />
                                                <Text className="text-xs font-medium text-green-500">
                                                    Confirmed
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Confirm button for claimed payments */}
                                    {ou.settlementStatus === "claimed" && (
                                        <View className="flex-row items-center gap-3 pt-3 mt-3 border-t border-muted">
                                            <View className="flex-row items-center flex-1 gap-2">
                                                <Icon
                                                    name="Clock"
                                                    size={16}
                                                    color="#f97316"
                                                />
                                                <Text className="text-sm text-orange-500">
                                                    Says they paid
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    handleConfirmPayment(
                                                        ou.id as Id<"orderUsers">,
                                                    )
                                                }
                                                className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-green-500">
                                                <Icon
                                                    name="Check"
                                                    size={16}
                                                    color="white"
                                                />
                                                <Text className="text-sm font-semibold text-white">
                                                    Confirm
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    /* Payer view */
                    myOrderUser &&
                    !myOrderUser.isCreator && (
                        <View className="px-4 mt-2">
                            <View className="p-5 border rounded-xl border-muted bg-card">
                                {/* Amount owed */}
                                <View className="items-center pb-4 mb-4 border-b border-muted">
                                    <Text className="text-sm text-muted-foreground">
                                        You owe {creatorName}
                                    </Text>
                                    <Text className="mt-1 text-4xl font-bold text-foreground">
                                        $
                                        {(
                                            Number(myOrderUser.amountOwed) / 100
                                        ).toFixed(2)}
                                    </Text>
                                </View>

                                {/* Status-specific content */}
                                {myOrderUser.settlementStatus === "unpaid" && (
                                    <View className="gap-3">
                                        {data.order.creatorPaypalMe ? (
                                            <>
                                                <TouchableOpacity
                                                    onPress={handlePayViaPaypal}
                                                    className="flex-row items-center justify-center gap-2 py-4 rounded-xl bg-blue-500">
                                                    <Icon
                                                        name="ExternalLink"
                                                        size={18}
                                                        color="white"
                                                    />
                                                    <Text className="text-base font-semibold text-white">
                                                        Pay with PayPal
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleClaimPayment}
                                                    className="flex-row items-center justify-center gap-2 py-4 border rounded-xl border-primary">
                                                    <Icon
                                                        name="Check"
                                                        size={18}
                                                        color={
                                                            NAV_THEME[
                                                                colorScheme
                                                            ].primary
                                                        }
                                                    />
                                                    <Text className="text-base font-semibold text-primary">
                                                        I Already Paid
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <>
                                                <View className="flex-row items-start gap-3 p-3 rounded-lg bg-yellow-500/10">
                                                    <Icon
                                                        name="Info"
                                                        size={16}
                                                        color="#ca8a04"
                                                    />
                                                    <Text className="flex-1 text-sm text-yellow-700">
                                                        {creatorName} hasn't set
                                                        up PayPal yet. Pay them
                                                        directly and mark it
                                                        here.
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={handleClaimPayment}
                                                    className="flex-row items-center justify-center gap-2 py-4 rounded-xl bg-primary">
                                                    <Icon
                                                        name="Check"
                                                        size={18}
                                                        color="white"
                                                    />
                                                    <Text className="text-base font-semibold text-white">
                                                        Mark as Paid
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                )}

                                {myOrderUser.settlementStatus === "claimed" && (
                                    <View className="flex-row items-center gap-3 p-4 rounded-xl bg-orange-500/10">
                                        <Icon
                                            name="Clock"
                                            size={20}
                                            color="#f97316"
                                        />
                                        <Text className="flex-1 text-sm text-orange-500">
                                            Waiting for {creatorName} to confirm
                                            your payment
                                        </Text>
                                    </View>
                                )}

                                {myOrderUser.settlementStatus ===
                                    "confirmed" && (
                                    <View className="flex-row items-center gap-3 p-4 rounded-xl bg-green-500/10">
                                        <Icon
                                            name="CircleCheck"
                                            size={20}
                                            color="#22c55e"
                                        />
                                        <Text className="flex-1 text-sm text-green-500">
                                            Payment confirmed! You're all set.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )
                )}
            </ScrollView>

            {/* Complete Order Footer */}
            {isCreator && allConfirmed && (
                <View className="px-6 pt-4 pb-10 border-t border-muted bg-background">
                    <TouchableOpacity
                        onPress={handleCompleteOrder}
                        className="flex-row items-center justify-center gap-2 py-4 rounded-xl bg-green-500">
                        <Icon name="CircleCheck" size={20} color="white" />
                        <Text className="text-base font-semibold text-white">
                            Complete Order
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
}
