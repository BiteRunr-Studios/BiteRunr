import React, { useState } from "react";
import {
    View,
    Text,
    Pressable,
    Linking,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Icon from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

type FAQItemProps = {
    question: string;
    answer: string;
};

function FAQItem({ question, answer }: FAQItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { colorScheme } = useColorScheme();

    return (
        <Pressable
            onPress={() => setIsExpanded(!isExpanded)}
            className="overflow-hidden border rounded-xl active:opacity-80 border-muted bg-card">
            <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1 gap-3">
                    <View className="items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10">
                        <Icon name="MessageCircleQuestionMark" size={16} color="#a855f7" />
                    </View>
                    <Text className="flex-1 pr-2 font-medium text-foreground">
                        {question}
                    </Text>
                </View>
                <Icon
                    name={isExpanded ? "ChevronUp" : "ChevronDown"}
                    size={20}
                    color={NAV_THEME[colorScheme].border}
                />
            </View>
            {isExpanded && (
                <View className="px-4 pb-4 ml-11">
                    <Text className="leading-5 text-muted-foreground">
                        {answer}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

export default function SupportScreen() {
    const { colorScheme } = useColorScheme();

    const handleEmailSupport = () => {
        Linking.openURL("mailto:biterunr@gmail.com?subject=BiteRunr%20Support");
    };

    const handleReportBug = () => {
        Linking.openURL(
            "mailto:biterunr@gmail.com?subject=BiteRunr%20Bug%20Report"
        );
    };

    const handleFeatureRequest = () => {
        Linking.openURL(
            "mailto:biterunr@gmail.com?subject=BiteRunr%20Feature%20Request"
        );
    };

    const faqs: FAQItemProps[] = [
        {
            question: "How do I create a group order?",
            answer: "Tap the '+' button on the home screen, give your order a name, add the pickup locations for that order, and invite your friends. Everyone can then write their order lines under each location.",
        },
        {
            question: "How do I invite friends to an order?",
            answer: "When creating or viewing an order, tap 'Invite Friends' to add people from your friends list. They'll receive a notification and can join the order to add their items.",
        },
        {
            question: "How does payment splitting work?",
            answer: "BiteRunr automatically tracks what each person ordered and calculates what they owe. After the order is complete, you can see the breakdown in the order details and mark payments as received.",
        },
        {
            question: "Can I order from multiple restaurants?",
            answer: "Yes. Each order can have multiple pickup locations, and everyone can add separate order lines for each one.",
        },
        {
            question: "How do I add friends?",
            answer: "Go to Account → Friends and tap 'Add Friend'. You can search for other BiteRunr users by their name or email and send them a friend request.",
        },
    ];

    const contactOptions = [
        {
            icon: "Mail" as const,
            iconBg: "bg-blue-500/10",
            iconColor: "#3b82f6",
            title: "Email Support",
            subtitle: "Get help from our team",
            onPress: handleEmailSupport,
        },
        {
            icon: "Bug" as const,
            iconBg: "bg-red-500/10",
            iconColor: "#ef4444",
            title: "Report a Bug",
            subtitle: "Let us know if something's broken",
            onPress: handleReportBug,
        },
        {
            icon: "Lightbulb" as const,
            iconBg: "bg-yellow-500/10",
            iconColor: "#eab308",
            title: "Request a Feature",
            subtitle: "Tell us what you'd like to see",
            onPress: handleFeatureRequest,
        },
    ];

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
                <Text className="flex-1 ml-2 text-xl font-semibold text-foreground">
                    Support
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}>
                {/* Support Header */}
                <View className="items-center p-6 mb-6">
                    <View className="items-center justify-center w-20 h-20 mb-4 rounded-2xl bg-primary/10">
                        <Icon
                            name="Headset"
                            size={40}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </View>
                    <Text className="text-2xl font-bold text-center text-foreground">
                        How can we help?
                    </Text>
                    <Text className="mt-2 text-center text-muted-foreground">
                        Find answers below or reach out to our team
                    </Text>
                </View>

                {/* Contact Options */}
                <View className="mb-6">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10">
                            <Icon name="MessageCircle" size={20} color="#3b82f6" />
                        </View>
                        <Text className="text-lg font-semibold text-foreground">
                            Contact Us
                        </Text>
                    </View>

                    <View className="gap-3">
                        {contactOptions.map((option) => (
                            <TouchableOpacity
                                key={option.title}
                                onPress={option.onPress}
                                className="flex-row items-center p-4 border rounded-xl border-muted bg-card active:opacity-80">
                                <View
                                    className={`items-center justify-center w-12 h-12 rounded-xl ${option.iconBg}`}>
                                    <Icon
                                        name={option.icon}
                                        size={24}
                                        color={option.iconColor}
                                    />
                                </View>
                                <View className="flex-1 ml-3">
                                    <Text className="text-base font-semibold text-foreground">
                                        {option.title}
                                    </Text>
                                    <Text className="mt-0.5 text-sm text-muted-foreground">
                                        {option.subtitle}
                                    </Text>
                                </View>
                                <Icon
                                    name="ChevronRight"
                                    size={20}
                                    color={NAV_THEME[colorScheme].border}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* FAQs */}
                <View className="mb-6">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10">
                            <Icon name="BookOpen" size={20} color="#a855f7" />
                        </View>
                        <Text className="text-lg font-semibold text-foreground">
                            Frequently Asked Questions
                        </Text>
                    </View>

                    <View className="gap-3">
                        {faqs.map((faq, index) => (
                            <FAQItem
                                key={index}
                                question={faq.question}
                                answer={faq.answer}
                            />
                        ))}
                    </View>
                </View>

                {/* Email Footer */}
                <View className="items-center p-4 bg-card">
                    <View className="flex-row items-center gap-2">
                        <Icon
                            name="Mail"
                            size={16}
                            color={NAV_THEME[colorScheme].border}
                        />
                        <Text className="text-sm text-muted-foreground">
                            You can also reach us directly at
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleEmailSupport}>
                        <Text className="mt-1 text-base font-semibold text-primary">
                            biterunr@gmail.com
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
