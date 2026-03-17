import React from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Icon, { IconName } from "@/components/common/icon";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import Constants from "expo-constants";

type FeatureItemProps = {
    icon: IconName;
    title: string;
    description: string;
};

function FeatureItem({ icon, title, description }: FeatureItemProps) {
    const { colorScheme } = useColorScheme();

    return (
        <View className="flex-row items-start mb-4">
            <View className="items-center justify-center w-10 h-10 rounded-full bg-primary/10 mr-3">
                <Icon
                    name={icon}
                    size={20}
                    color={NAV_THEME[colorScheme].primary}
                />
            </View>
            <View className="flex-1">
                <Text className="text-foreground font-semibold">{title}</Text>
                <Text className="text-muted-foreground text-sm">
                    {description}
                </Text>
            </View>
        </View>
    );
}

export default function AboutScreen() {
    const { colorScheme } = useColorScheme();
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";

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
                    About
                </Text>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                {/* App Logo & Name */}
                <View className="items-center mb-6 mt-2">
                    <Image
                        source={
                            colorScheme === "light"
                                ? require("@/assets/images/icon-dark.png")
                                : require("@/assets/images/icon.png")
                        }
                        className="w-24 h-24 rounded-3xl mb-4"
                    />
                    <Text className="text-3xl font-bold text-foreground">
                        BiteRunr
                    </Text>
                    <Text className="text-muted-foreground mt-1">
                        Version {appVersion}
                    </Text>
                </View>

                {/* App Description */}
                <View className="mb-6">
                    <Text className="text-foreground text-center leading-6">
                        BiteRunr makes group food ordering simple. Coordinate meals
                        with friends, split orders across multiple restaurants, and
                        keep track of who owes what — all in one place.
                    </Text>
                </View>

                {/* Features Section */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-foreground mb-4">
                        Features
                    </Text>

                    <FeatureItem
                        icon="Users"
                        title="Group Orders"
                        description="Create orders and invite friends to join. Everyone adds their items from selected restaurants."
                    />

                    <FeatureItem
                        icon="MapPin"
                        title="Multiple Locations"
                        description="Order from several restaurants in a single group order. Perfect for when everyone wants something different."
                    />

                    <FeatureItem
                        icon="Receipt"
                        title="Easy Splitting"
                        description="Automatically track what each person ordered and what they owe. No more manual calculations."
                    />

                    <FeatureItem
                        icon="Mic"
                        title="Voice Ordering"
                        description="Speak your order lines and let BiteRunr clean them up into structured items."
                    />

                    <FeatureItem
                        icon="UserPlus"
                        title="Friends"
                        description="Add friends to easily invite them to future orders. Build your food crew."
                    />
                </View>

                {/* Footer */}
                <View className="items-center pt-4 border-t border-border">
                    <Text className="text-muted-foreground text-sm">
                        Made with love by
                    </Text>
                    <Text className="text-foreground font-semibold mt-1">
                        Runr Studios
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
