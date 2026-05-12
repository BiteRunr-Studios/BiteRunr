import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import Icon from "@/components/common/icon";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";
import { BrText } from "@/components/br";

type NotificationPermissionModalProps = {
    visible: boolean;
    onAllow: () => void;
    onDeny: () => void;
};

const FEATURES = [
    { icon: "UserPlus" as const, color: BR.mintInk, bg: BR.mintSoft, label: "Friend requests" },
    { icon: "Users" as const, color: BR.lilac, bg: BR.lilacSoft, label: "Group order invitations" },
    { icon: "CircleCheck" as const, color: BR.orangeDeep, bg: BR.orangeTint, label: "Order ready alerts" },
];

export function NotificationPermissionModal({
    visible,
    onAllow,
    onDeny,
}: NotificationPermissionModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
        >
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {/* Icon */}
                    <View style={styles.iconTile}>
                        <Icon name="Bell" size={32} color={BR.orangeDeep} />
                    </View>

                    {/* Title */}
                    <BrText weight="bold" style={styles.title}>
                        Stay in the loop
                    </BrText>

                    {/* Description */}
                    <Text style={styles.desc}>
                        Get notified when friends send requests, group orders start, and when it's time to pay up.
                    </Text>

                    {/* Feature list */}
                    <View style={styles.featureList}>
                        {FEATURES.map((f) => (
                            <View key={f.label} style={styles.featureRow}>
                                <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                                    <Icon name={f.icon} size={18} color={f.color} />
                                </View>
                                <Text style={styles.featureLabel}>{f.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Allow button */}
                    <Pressable onPress={onAllow} style={styles.allowBtn}>
                        <Icon name="Bell" size={16} color="#fff" />
                        <Text style={styles.allowBtnText}>Allow notifications</Text>
                    </Pressable>

                    {/* Deny button */}
                    <Pressable onPress={onDeny} style={styles.denyBtn}>
                        <Text style={styles.denyBtnText}>Maybe later</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 18,
        paddingBottom: 32,
    },
    sheet: {
        width: "100%",
        backgroundColor: BR.paper,
        borderRadius: 28,
        padding: 24,
        alignItems: "center",
        ...BR_SHADOW.card,
    },
    iconTile: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: BR.orangeTint,
        borderWidth: 1,
        borderColor: "rgba(255,106,31,0.18)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        lineHeight: 28,
        textAlign: "center",
        color: BR.ink,
        marginBottom: 8,
    },
    desc: {
        fontSize: 14,
        lineHeight: 21,
        color: BR.ink3,
        textAlign: "center",
        marginBottom: 20,
    },
    featureList: {
        width: "100%",
        gap: 10,
        marginBottom: 24,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
        padding: 12,
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    featureLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: BR.ink,
    },
    allowBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        height: 54,
        borderRadius: BR_RADIUS.md,
        backgroundColor: BR.orange,
        marginBottom: 10,
        ...BR_SHADOW.primary,
    },
    allowBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        fontFamily: BR_FONT.display,
    },
    denyBtn: {
        width: "100%",
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    denyBtnText: {
        fontSize: 14,
        color: BR.ink3,
        fontWeight: "500",
    },
});
