import React, { useState } from "react";
import { View, Text, Pressable, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Icon from "@/components/common/icon";
import { ListItem } from "@/components/profile/list-item";
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
            className="mb-3 overflow-hidden border rounded-2xl active:opacity-80 border-border">
            <View className="flex-row items-center justify-between p-4">
                <Text className="flex-1 pr-2 font-medium text-foreground">
                    {question}
                </Text>
                <Icon
                    name={isExpanded ? "ChevronUp" : "ChevronDown"}
                    size={20}
                    color={NAV_THEME[colorScheme].primary}
                />
            </View>
            {isExpanded && (
                <View className="px-4 pb-4 -mt-1">
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
            answer: "Tap the '+' button on the home screen, give your order a name, select the restaurants you want to order from, and invite your friends. Everyone can then add their items to the shared order.",
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
            answer: "Yes! When creating an order, you can add multiple locations. Each participant can then add items from any of the selected restaurants.",
        },
        {
            question: "How do I add friends?",
            answer: "Go to Account → Friends and tap 'Add Friend'. You can search for other BiteRunr users by their name or email and send them a friend request.",
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
                contentContainerStyle={{ padding: 16 }}>
                {/* Support Header */}
                <View className="items-center mt-2 mb-6">
                    <View className="items-center justify-center w-20 h-20 mb-4 rounded-full bg-primary/10">
                        <Icon
                            name="LifeBuoy"
                            size={40}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </View>
                    <Text className="text-2xl font-bold text-center text-foreground">
                        How can we help?
                    </Text>
                    <Text className="mt-2 text-center text-muted-foreground">
                        Find answers below or reach out to our team.
                    </Text>
                </View>

                {/* Contact Options */}
                <View className="mb-6">
                    <Text className="mb-3 text-lg font-semibold text-foreground">
                        Contact Us
                    </Text>

                    <View className="gap-3">
                        <ListItem
                            iconName="Mail"
                            title="Email Support"
                            subtitle="Get help from our team"
                            onPress={handleEmailSupport}
                        />

                        <ListItem
                            iconName="Bug"
                            title="Report a Bug"
                            subtitle="Let us know if something's broken"
                            onPress={handleReportBug}
                        />

                        <ListItem
                            iconName="Lightbulb"
                            title="Request a Feature"
                            subtitle="Tell us what you'd like to see"
                            onPress={handleFeatureRequest}
                        />
                    </View>
                </View>

                {/* FAQs */}
                <View className="mb-6">
                    <Text className="mb-3 text-lg font-semibold text-foreground">
                        Frequently Asked Questions
                    </Text>

                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                        />
                    ))}
                </View>

                {/* Email Footer */}
                <View className="items-center pt-4 border-t border-border">
                    <Text className="text-sm text-muted-foreground">
                        You can also reach us directly at
                    </Text>
                    <Pressable onPress={handleEmailSupport}>
                        <Text className="mt-1 font-semibold text-primary">
                            biterunr@gmail.com
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
