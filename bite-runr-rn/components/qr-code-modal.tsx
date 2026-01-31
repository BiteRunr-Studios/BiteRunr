import React, { useEffect } from "react";
import { View, Text, Modal, Pressable, Share, ActivityIndicator } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Icon from "@/components/common/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type QRCodeModalProps = {
    visible: boolean;
    orderId: Id<"orders">;
    orderName: string;
    onClose: () => void;
};

export function QRCodeModal({
    visible,
    orderId,
    orderName,
    onClose,
}: QRCodeModalProps) {
    const { colorScheme } = useColorScheme();
    const activeInvite = useQuery(api.orderInvites.getActiveInvite, { orderId });
    const createInvite = useMutation(api.orderInvites.createInvite);
    const [isCreating, setIsCreating] = React.useState(false);

    // Create invite when modal opens if none exists
    useEffect(() => {
        if (visible && activeInvite === null && !isCreating) {
            setIsCreating(true);
            createInvite({ orderId })
                .catch((err) => console.error("Failed to create invite:", err))
                .finally(() => setIsCreating(false));
        }
    }, [visible, activeInvite, orderId, createInvite, isCreating]);

    const inviteCode = activeInvite?.code;
    const deepLink = inviteCode ? `biterunr://join/${inviteCode}` : null;

    // Calculate time remaining
    const getTimeRemaining = () => {
        if (!activeInvite?.expiresAt) return null;
        const remaining = activeInvite.expiresAt - Date.now();
        if (remaining <= 0) return "Expired";

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        }
        return `${minutes}m remaining`;
    };

    const handleShare = async () => {
        if (!inviteCode) return;

        try {
            await Share.share({
                message: `Join my BiteRunr order "${orderName}"!\n\nOpen this link to join: ${deepLink}\n\nOr enter code: ${inviteCode}`,
            });
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    const isLoading = activeInvite === undefined || isCreating;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent
            onRequestClose={onClose}>
            <Pressable
                className="flex-1 justify-center items-center bg-black/50 px-6"
                onPress={onClose}>
                <Pressable
                    className="w-full bg-card rounded-3xl p-6 items-center"
                    onPress={(e) => e.stopPropagation()}>
                    {/* Close button */}
                    <Pressable
                        onPress={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full active:opacity-70">
                        <Icon
                            name="X"
                            size={24}
                            color={NAV_THEME[colorScheme].border}
                        />
                    </Pressable>

                    {/* Header */}
                    <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                        <Icon
                            name="QrCode"
                            size={32}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </View>

                    <Text className="text-xl font-bold text-foreground text-center mb-1">
                        Invite to Order
                    </Text>
                    <Text className="text-sm text-muted-foreground text-center mb-6">
                        Scan QR code or share the link to join
                    </Text>

                    {isLoading ? (
                        <View className="w-48 h-48 items-center justify-center">
                            <ActivityIndicator
                                size="large"
                                color={NAV_THEME[colorScheme].primary}
                            />
                            <Text className="text-muted-foreground mt-4">
                                Generating invite...
                            </Text>
                        </View>
                    ) : deepLink ? (
                        <>
                            {/* QR Code */}
                            <View className="p-4 bg-white rounded-2xl mb-4">
                                <QRCode
                                    value={deepLink}
                                    size={180}
                                    backgroundColor="white"
                                    color="black"
                                />
                            </View>

                            {/* Invite Code Display */}
                            <View className="w-full bg-muted rounded-xl p-4 mb-4">
                                <Text className="text-xs text-muted-foreground text-center mb-1">
                                    INVITE CODE
                                </Text>
                                <Text className="text-2xl font-bold text-foreground text-center tracking-widest">
                                    {inviteCode}
                                </Text>
                            </View>

                            {/* Expiry info */}
                            {getTimeRemaining() && (
                                <View className="flex-row items-center gap-2 mb-4">
                                    <Icon
                                        name="Clock"
                                        size={14}
                                        color={NAV_THEME[colorScheme].border}
                                    />
                                    <Text className="text-sm text-muted-foreground">
                                        {getTimeRemaining()}
                                    </Text>
                                </View>
                            )}

                            {/* Share button */}
                            <Pressable
                                onPress={handleShare}
                                className="w-full flex-row items-center justify-center gap-2 py-4 rounded-xl bg-primary active:opacity-80">
                                <Icon name="Share" size={20} color="white" />
                                <Text className="text-white font-semibold text-base">
                                    Share Invite
                                </Text>
                            </Pressable>
                        </>
                    ) : (
                        <View className="w-48 h-48 items-center justify-center">
                            <Icon
                                name="CircleAlert"
                                size={48}
                                color={NAV_THEME[colorScheme].notification}
                            />
                            <Text className="text-muted-foreground text-center mt-4">
                                Failed to create invite. Please try again.
                            </Text>
                        </View>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}
