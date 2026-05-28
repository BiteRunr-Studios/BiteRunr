import React from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Icon, { type IconName } from "@/components/common/icon";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
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

function FeatureItem({
  icon,
  iconColor,
  iconBg,
  title,
  description,
}: FeatureItemProps) {
  return (
    <View className="flex-row items-start gap-3.5 p-3.5">
      <View
        className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
        style={{ backgroundColor: iconBg }}
      >
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-sm font-bold text-[#1A1410]">{title}</Text>
        <Text className="text-xs leading-[18px] text-[#8A7A6E]">
          {description}
        </Text>
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
    description:
      "Create orders and invite friends to join. Everyone adds their items from selected restaurants.",
  },
  {
    icon: "MapPin",
    iconColor: BR.coral,
    iconBg: BR.coralSoft,
    title: "Multiple Locations",
    description:
      "Order from several restaurants in a single group order. Perfect for when everyone wants something different.",
  },
  {
    icon: "Receipt",
    iconColor: BR.orangeDeep,
    iconBg: BR.orangeTint,
    title: "Easy Splitting",
    description:
      "Automatically track what each person ordered and what they owe. No more manual calculations.",
  },
  {
    icon: "Mic",
    iconColor: BR.mint,
    iconBg: BR.mintSoft,
    title: "Voice Ordering",
    description:
      "Speak your order lines and let BiteRunr clean them up into structured items.",
  },
  {
    icon: "UserPlus",
    iconColor: BR.yolk,
    iconBg: BR.yolkSoft,
    title: "Friends",
    description:
      "Add friends to easily invite them to future orders. Build your food crew.",
  },
];

export default function AboutScreen() {
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
      <View className="flex-row items-center justify-between px-[18px] pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <BrText
          weight="bold"
          className="text-[17px] leading-6"
          style={BR_FONT_STYLE.display}
        >
          About
        </BrText>
        <View className="w-[38px]" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[18px] pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View
          entering={FadeInUp.duration(300)}
          className="items-center py-7"
        >
          <Image
            source={require("@/assets/images/icon.png")}
            className="h-20 w-20 rounded-[22px]"
          />
          <BrText
            weight="bold"
            className="mt-3.5 text-center text-[28px] leading-9"
          >
            BiteRunr
          </BrText>
          <Text className="mt-1.5 font-['JetBrainsMono_500Medium'] text-[11px] uppercase tracking-[0.8px] text-[#8A7A6E]">
            v{appVersion}
          </Text>
          <Text className="mt-1.5 text-center text-sm leading-5 text-[#8A7A6E]">
            Group food ordering, made simple
          </Text>
        </Animated.View>

        {/* Description */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(60)}
          className="rounded-[16px] border border-[rgba(26,20,16,0.08)] bg-white p-4"
        >
          <Text className="text-center text-sm leading-[22px] text-[#4A3C32]">
            BiteRunr makes group food runs effortless. Coordinate meals with
            friends, split orders across multiple restaurants, and keep track of
            who owes what — all in one place.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(120)}
          className="mt-7"
        >
          <Text className="mb-2.5 font-['JetBrainsMono_500Medium'] text-[11px] uppercase tracking-[1.2px] text-[#8A7A6E]">
            Features
          </Text>
          <View className="overflow-hidden rounded-[16px] border border-[rgba(26,20,16,0.08)] bg-white">
            {FEATURES.map((f, i) => (
              <React.Fragment key={f.title}>
                <FeatureItem {...f} />
                {i < FEATURES.length - 1 && (
                  <View className="ml-[72px] h-px bg-[rgba(26,20,16,0.08)]" />
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(180)}
          className="mt-8 items-center gap-0.5 rounded-[16px] border border-[rgba(26,20,16,0.08)] bg-white p-5"
        >
          <Text className="text-[13px] text-[#8A7A6E]">Made with love by</Text>
          <BrText weight="bold" className="mt-0.5 text-[15px] text-[#1A1410]">
            Runr Studios
          </BrText>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
