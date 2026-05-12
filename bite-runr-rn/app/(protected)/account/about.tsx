import React from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Icon, { IconName } from "@/components/common/icon";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import Animated, { FadeInUp } from "react-native-reanimated";
import Constants from "expo-constants";

type FeatureItemProps = {
    icon: IconName;
    iconColor: string;
    iconBg: string;
    title: string;
    description: string;
};

function FeatureItem({ icon, iconColor, iconBg, title, description }: FeatureItemProps) {
    return (
        <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: iconBg }]}>
                <Icon name={icon} size={20} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureSub}>{description}</Text>
            </View>
        </View>
    );
}

const FEATURES: FeatureItemProps[] = [
    {
        icon: "Users",
        iconColor: BR.lilac,
        iconBg: BR.lilacSoft,
        title: "Group Orders",
        description: "Create orders and invite friends to join. Everyone adds their items from selected restaurants.",
    },
    {
        icon: "MapPin",
        iconColor: BR.coral,
        iconBg: BR.coralSoft,
        title: "Multiple Locations",
        description: "Order from several restaurants in a single group order. Perfect for when everyone wants something different.",
    },
    {
        icon: "Receipt",
        iconColor: BR.orangeDeep,
        iconBg: BR.orangeTint,
        title: "Easy Splitting",
        description: "Automatically track what each person ordered and what they owe. No more manual calculations.",
    },
    {
        icon: "Mic",
        iconColor: BR.mint,
        iconBg: BR.mintSoft,
        title: "Voice Ordering",
        description: "Speak your order lines and let BiteRunr clean them up into structured items.",
    },
    {
        icon: "UserPlus",
        iconColor: BR.yolk,
        iconBg: BR.yolkSoft,
        title: "Friends",
        description: "Add friends to easily invite them to future orders. Build your food crew.",
    },
];

export default function AboutScreen() {
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BR.paper }}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Icon name="ChevronLeft" size={20} color={BR.ink} />
                </Pressable>
                <BrText weight="bold" style={{ fontSize: 17, lineHeight: 24 }}>About</BrText>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <Animated.View entering={FadeInUp.duration(300)} style={styles.hero}>
                    <Image
                        source={require("@/assets/images/icon.png")}
                        style={styles.appIcon}
                    />
                    <BrText weight="bold" style={{ fontSize: 28, lineHeight: 36, marginTop: 14, textAlign: "center" }}>
                        BiteRunr
                    </BrText>
                    <Text style={styles.versionBadge}>v{appVersion}</Text>
                    <Text style={styles.heroSub}>
                        Group food ordering, made simple
                    </Text>
                </Animated.View>

                {/* Description */}
                <Animated.View entering={FadeInUp.duration(300).delay(60)} style={styles.descCard}>
                    <Text style={styles.descText}>
                        BiteRunr makes group food runs effortless. Coordinate meals with friends, split orders across multiple restaurants, and keep track of who owes what — all in one place.
                    </Text>
                </Animated.View>

                {/* Features */}
                <Animated.View entering={FadeInUp.duration(300).delay(120)} style={{ marginTop: 28 }}>
                    <Text style={styles.sectionLabel}>Features</Text>
                    <View style={styles.featuresCard}>
                        {FEATURES.map((f, i) => (
                            <React.Fragment key={f.title}>
                                <FeatureItem {...f} />
                                {i < FEATURES.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                        ))}
                    </View>
                </Animated.View>

                {/* Footer */}
                <Animated.View entering={FadeInUp.duration(300).delay(180)} style={styles.footer}>
                    <Text style={styles.footerLabel}>Made with love by</Text>
                    <BrText weight="bold" style={{ fontSize: 15, color: BR.ink, marginTop: 2 }}>
                        Runr Studios
                    </BrText>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        borderWidth: 1,
        borderColor: BR.line,
        alignItems: "center",
        justifyContent: "center",
    },
    hero: {
        alignItems: "center",
        paddingVertical: 28,
    },
    appIcon: {
        width: 80,
        height: 80,
        borderRadius: 22,
    },
    versionBadge: {
        marginTop: 6,
        fontSize: 11,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    heroSub: {
        fontSize: 14,
        color: BR.ink3,
        marginTop: 6,
        textAlign: "center",
        lineHeight: 20,
    },
    descCard: {
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
        padding: 16,
    },
    descText: {
        fontSize: 14,
        color: BR.ink2,
        lineHeight: 22,
        textAlign: "center",
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        marginBottom: 10,
    },
    featuresCard: {
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
        overflow: "hidden",
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        padding: 14,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: BR.ink,
        marginBottom: 2,
    },
    featureSub: {
        fontSize: 12,
        color: BR.ink3,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: BR.line,
        marginLeft: 72,
    },
    footer: {
        alignItems: "center",
        marginTop: 32,
        padding: 20,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
        gap: 2,
    },
    footerLabel: {
        fontSize: 13,
        color: BR.ink3,
    },
});
