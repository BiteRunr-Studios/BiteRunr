import React from "react";
import { View, Text, Modal, Pressable } from "react-native";
import Icon from "@/components/common/icon";

type NotificationPermissionModalProps = {
    visible: boolean;
    onAllow: () => void;
    onDeny: () => void;
};

export function NotificationPermissionModal({
    visible,
    onAllow,
    onDeny,
}: NotificationPermissionModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent>
            <View className="flex-1 justify-center items-center bg-black/50 px-6">
                <View className="w-full bg-card rounded-3xl p-6 items-center">
                    {/* Icon */}
                    <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-5">
                        <Icon name="Bell" size={40} color="#4A90D9" />
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-bold text-foreground text-center mb-3">
                        Stay in the Loop
                    </Text>

                    {/* Description */}
                    <Text className="text-base text-muted-foreground text-center mb-6 leading-6">
                        Get notified when friends send you requests, group
                        orders start, and when everyone's ready to order.
                    </Text>

                    {/* Feature list */}
                    <View className="w-full mb-6 gap-3">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-green-500/10 items-center justify-center">
                                <Icon name="UserPlus" size={20} color="#22c55e" />
                            </View>
                            <Text className="flex-1 text-sm text-foreground">
                                Friend requests
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
                                <Icon name="Users" size={20} color="#3b82f6" />
                            </View>
                            <Text className="flex-1 text-sm text-foreground">
                                Group order invitations
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-purple-500/10 items-center justify-center">
                                <Icon name="CircleCheck" size={20} color="#a855f7" />
                            </View>
                            <Text className="flex-1 text-sm text-foreground">
                                Orders ready alerts
                            </Text>
                        </View>
                    </View>

                    {/* Allow Button */}
                    <Pressable
                        onPress={onAllow}
                        className="w-full py-4 rounded-xl bg-primary items-center mb-3 active:opacity-80">
                        <Text className="text-white font-semibold text-base">
                            Allow Notifications
                        </Text>
                    </Pressable>

                    {/* Deny Button */}
                    <Pressable
                        onPress={onDeny}
                        className="w-full py-4 rounded-xl items-center active:opacity-80">
                        <Text className="text-muted-foreground font-medium text-base">
                            Maybe Later
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
