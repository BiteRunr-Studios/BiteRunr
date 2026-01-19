import React, { useState } from "react";
import { View, Text, Pressable, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Icon, { IconName } from "@/components/common/icon";
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
            className="bg-muted/30 rounded-2xl mb-3 overflow-hidden active:opacity-80"
        >
            <View className="flex-row items-center justify-between p-4">
                <Text className="text-foreground font-medium flex-1 pr-2">
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
                    <Text className="text-muted-foreground leading-5">
                        {answer}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

type HelpTopicProps = {
    icon: IconName;
    title: string;
    description: string;
    onPress: () => void;
};

function HelpTopic({ icon, title, description, onPress }: HelpTopicProps) {
    const { colorScheme } = useColorScheme();

    return (
        <Pressable
            onPress={onPress}
            className="flex-row items-center p-4 bg-muted/30 rounded-2xl mb-3 active:opacity-70"
        >
            <View className="items-center justify-center w-10 h-10 rounded-full bg-primary/10 mr-3">
                <Icon
                    name={icon}
                    size={20}
                    color={NAV_THEME[colorScheme].primary}
                />
            </View>
            <View className="flex-1">
                <Text className="text-foreground font-medium">{title}</Text>
                <Text className="text-muted-foreground text-sm">
                    {description}
                </Text>
            </View>
            <Icon name="ChevronRight" size={20} color="#666" />
        </Pressable>
    );
}

export default function SupportScreen() {
    const { colorScheme } = useColorScheme();

    const handleEmailSupport = () => {
        Linking.openURL("mailto:biterunr@gmail.com?subject=BiteRunr%20Support");
    };

    const handleReportBug = () => {
        Linking.openURL("mailto:biterunr@gmail.com?subject=BiteRunr%20Bug%20Report");
    };

    const handleFeatureRequest = () => {
        Linking.openURL("mailto:biterunr@gmail.com?subject=BiteRunr%20Feature%20Request");
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
                    className="p-2 -ml-2 rounded-full active:opacity-70"
                >
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
            >
                {/* Support Header */}
                <View className="items-center mb-6 mt-2">
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                        <Icon
                            name="LifeBuoy"
                            size={40}
                            color={NAV_THEME[colorScheme].primary}
                        />
                    </View>
                    <Text className="text-2xl font-bold text-foreground text-center">
                        How can we help?
                    </Text>
                    <Text className="text-muted-foreground text-center mt-2">
                        Find answers below or reach out to our team.
                    </Text>
                </View>

                {/* Contact Options */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-foreground mb-3">
                        Contact Us
                    </Text>

                    <HelpTopic
                        icon="Mail"
                        title="Email Support"
                        description="Get help from our team"
                        onPress={handleEmailSupport}
                    />

                    <HelpTopic
                        icon="Bug"
                        title="Report a Bug"
                        description="Let us know if something's broken"
                        onPress={handleReportBug}
                    />

                    <HelpTopic
                        icon="Lightbulb"
                        title="Request a Feature"
                        description="Tell us what you'd like to see"
                        onPress={handleFeatureRequest}
                    />
                </View>

                {/* FAQs */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-foreground mb-3">
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
                    <Text className="text-muted-foreground text-sm">
                        You can also reach us directly at
                    </Text>
                    <Pressable onPress={handleEmailSupport}>
                        <Text className="text-primary font-semibold mt-1">
                            biterunr@gmail.com
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}