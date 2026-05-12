import React, { useState } from "react";
import {
    View,
    Text,
    Pressable,
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Icon from "@/components/common/icon";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import Animated, { FadeInUp } from "react-native-reanimated";

const SUPPORT_EMAIL = "biterunr@gmail.com";

function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <Pressable
            onPress={() => setOpen((v) => !v)}
            style={styles.faqCard}
        >
            <View style={styles.faqRow}>
                <Text style={[styles.faqQuestion, { flex: 1, marginRight: 12 }]}>{question}</Text>
                <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} color={BR.ink3} />
            </View>
            {open && <Text style={styles.faqAnswer}>{answer}</Text>}
        </Pressable>
    );
}

const CONTACT_OPTIONS = [
    { icon: "Mail" as const, color: BR.lilac, bg: BR.lilacSoft, title: "Email support", sub: "Get help from our team", url: `mailto:${SUPPORT_EMAIL}?subject=BiteRunr%20Support` },
    { icon: "Bug" as const, color: BR.coral, bg: BR.coralSoft, title: "Report a bug", sub: "Let us know if something's broken", url: `mailto:${SUPPORT_EMAIL}?subject=BiteRunr%20Bug%20Report` },
    { icon: "Lightbulb" as const, color: BR.yolk, bg: BR.yolkSoft, title: "Request a feature", sub: "Tell us what you'd like to see", url: `mailto:${SUPPORT_EMAIL}?subject=BiteRunr%20Feature%20Request` },
];

const FAQS = [
    { question: "How do I create a group order?", answer: "Tap the '+' button on the home screen, give your order a name, add the pickup locations, and invite your friends. Everyone can then add their order lines under each location." },
    { question: "How do I invite friends to an order?", answer: "When creating or viewing an order, tap 'Invite Friends' to add people from your friends list. They'll receive a notification and can join to add their items." },
    { question: "How does payment splitting work?", answer: "BiteRunr automatically tracks what each person ordered and calculates what they owe. After the order is complete, the runner can collect payments through the settlement screen." },
    { question: "Can I order from multiple restaurants?", answer: "Yes. Each order can have multiple pickup locations, and everyone can add separate order lines for each one." },
    { question: "How do I add friends?", answer: "Go to Account → Friends and use the Search tab to find other BiteRunr users by name, then send a friend request." },
];

export default function SupportScreen() {
    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: BR.paper }}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Icon name="ChevronLeft" size={20} color={BR.ink} />
                </Pressable>
                <BrText weight="bold" style={{ fontSize: 17, lineHeight: 24 }}>Support</BrText>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <Animated.View entering={FadeInUp.duration(300)} style={styles.hero}>
                    <View style={styles.heroIcon}>
                        <Icon name="Headset" size={32} color={BR.orangeDeep} />
                    </View>
                    <BrText weight="bold" style={{ fontSize: 26, lineHeight: 34, marginTop: 14, textAlign: "center" }}>
                        How can we help?
                    </BrText>
                    <Text style={styles.heroSub}>
                        Find answers below or reach out to our team
                    </Text>
                </Animated.View>

                {/* Contact options */}
                <Animated.View entering={FadeInUp.duration(300).delay(60)}>
                    <Text style={styles.sectionLabel}>Contact us</Text>
                    <View style={{ gap: 10, marginTop: 10 }}>
                        {CONTACT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.title}
                                onPress={() => Linking.openURL(opt.url)}
                                style={styles.contactRow}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.contactIcon, { backgroundColor: opt.bg }]}>
                                    <Icon name={opt.icon} size={20} color={opt.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.contactTitle}>{opt.title}</Text>
                                    <Text style={styles.contactSub}>{opt.sub}</Text>
                                </View>
                                <Icon name="ChevronRight" size={16} color={BR.ink3} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* FAQs */}
                <Animated.View entering={FadeInUp.duration(300).delay(120)} style={{ marginTop: 28 }}>
                    <Text style={styles.sectionLabel}>Frequently asked questions</Text>
                    <View style={{ gap: 8, marginTop: 10 }}>
                        {FAQS.map((faq, i) => (
                            <FAQItem key={i} question={faq.question} answer={faq.answer} />
                        ))}
                    </View>
                </Animated.View>

                {/* Email footer */}
                <Animated.View entering={FadeInUp.duration(300).delay(160)} style={styles.emailFooter}>
                    <Text style={styles.emailFooterLabel}>You can also reach us directly at</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
                        <Text style={styles.emailFooterAddress}>{SUPPORT_EMAIL}</Text>
                    </TouchableOpacity>
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
    heroIcon: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: BR.orangeTint,
        borderWidth: 1,
        borderColor: "rgba(255,106,31,0.18)",
        alignItems: "center",
        justifyContent: "center",
    },
    heroSub: {
        fontSize: 14,
        color: BR.ink3,
        marginTop: 6,
        textAlign: "center",
        lineHeight: 20,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: BR_FONT.mono,
        color: BR.ink3,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
    },
    contactIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    contactTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: BR.ink,
    },
    contactSub: {
        fontSize: 12,
        color: BR.ink3,
        marginTop: 2,
    },
    faqCard: {
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
        padding: 14,
    },
    faqRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    faqQuestion: {
        fontSize: 14,
        fontWeight: "600",
        color: BR.ink,
        lineHeight: 20,
    },
    faqAnswer: {
        fontSize: 13,
        color: BR.ink3,
        lineHeight: 19,
        marginTop: 10,
    },
    emailFooter: {
        alignItems: "center",
        marginTop: 32,
        padding: 20,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderColor: BR.line,
        gap: 4,
    },
    emailFooterLabel: {
        fontSize: 13,
        color: BR.ink3,
    },
    emailFooterAddress: {
        fontSize: 14,
        fontWeight: "700",
        color: BR.orangeDeep,
    },
});
