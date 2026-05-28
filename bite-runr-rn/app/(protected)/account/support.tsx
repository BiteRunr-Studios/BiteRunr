import { useState } from "react";
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
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import { BrText } from "@/components/br";
import Animated, { FadeInUp } from "react-native-reanimated";

const SUPPORT_EMAIL = "biterunr@gmail.com";

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      className="rounded-[16px] border border-[rgba(26,20,16,0.08)] bg-white p-3.5"
    >
      <View className="flex-row items-center">
        <Text className="mr-3 flex-1 text-sm font-semibold leading-5 text-[#1A1410]">
          {question}
        </Text>
        <Icon
          name={open ? "ChevronUp" : "ChevronDown"}
          size={18}
          color={BR.ink3}
        />
      </View>
      {open && (
        <Text className="mt-2.5 text-[13px] leading-[19px] text-[#8A7A6E]">
          {answer}
        </Text>
      )}
    </Pressable>
  );
}

const CONTACT_OPTIONS = [
  {
    icon: "Mail" as const,
    color: BR.lilac,
    bg: BR.lilacSoft,
    title: "Email support",
    sub: "Get help from our team",
    url: `mailto:${SUPPORT_EMAIL}?subject=BiteRunr%20Support`,
  },
  {
    icon: "Bug" as const,
    color: BR.coral,
    bg: BR.coralSoft,
    title: "Report a bug",
    sub: "Let us know if something's broken",
    url: `mailto:${SUPPORT_EMAIL}?subject=BiteRunr%20Bug%20Report`,
  },
  {
    icon: "Lightbulb" as const,
    color: BR.yolk,
    bg: BR.yolkSoft,
    title: "Request a feature",
    sub: "Tell us what you'd like to see",
    url: `mailto:${SUPPORT_EMAIL}?subject=BiteRunr%20Feature%20Request`,
  },
];

const FAQS = [
  {
    question: "How do I create a group order?",
    answer:
      "Tap the '+' button on the home screen, give your order a name, add the pickup locations, and invite your friends. Everyone can then add their order lines under each location.",
  },
  {
    question: "How do I invite friends to an order?",
    answer:
      "When creating or viewing an order, tap 'Invite Friends' to add people from your friends list. They'll receive a notification and can join to add their items.",
  },
  {
    question: "How does payment splitting work?",
    answer:
      "BiteRunr automatically tracks what each person ordered and calculates what they owe. After the order is complete, the runner can collect payments through the settlement screen.",
  },
  {
    question: "Can I order from multiple restaurants?",
    answer:
      "Yes. Each order can have multiple pickup locations, and everyone can add separate order lines for each one.",
  },
  {
    question: "How do I add friends?",
    answer:
      "Go to Account → Friends and use the Search tab to find other BiteRunr users by name, then send a friend request.",
  },
];

export default function SupportScreen() {
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
          Support
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
          <View className="h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-[rgba(255,106,31,0.18)] bg-[#FFF1E2]">
            <Icon name="Headset" size={32} color={BR.orangeDeep} />
          </View>
          <BrText
            weight="bold"
            className="mt-3.5 text-center text-[26px] leading-[34px]"
          >
            How can we help?
          </BrText>
          <Text className="mt-1.5 text-center text-sm leading-5 text-[#8A7A6E]">
            Find answers below or reach out to our team
          </Text>
        </Animated.View>

        {/* Contact options */}
        <Animated.View entering={FadeInUp.duration(300).delay(60)}>
          <Text className="font-['JetBrainsMono_500Medium'] text-[11px] uppercase tracking-[1.2px] text-[#8A7A6E]">
            Contact us
          </Text>
          <View className="mt-2.5 gap-2.5">
            {CONTACT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.title}
                onPress={() => Linking.openURL(opt.url)}
                className="flex-row items-center gap-3.5 rounded-[16px] border border-[rgba(26,20,16,0.08)] bg-white p-3.5"
                activeOpacity={0.85}
              >
                <View
                  className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                  style={{ backgroundColor: opt.bg }}
                >
                  <Icon name={opt.icon} size={20} color={opt.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-[#1A1410]">
                    {opt.title}
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#8A7A6E]">
                    {opt.sub}
                  </Text>
                </View>
                <Icon name="ChevronRight" size={16} color={BR.ink3} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* FAQs */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(120)}
          className="mt-7"
        >
          <Text className="font-['JetBrainsMono_500Medium'] text-[11px] uppercase tracking-[1.2px] text-[#8A7A6E]">
            Frequently asked questions
          </Text>
          <View className="mt-2.5 gap-2">
            {FAQS.map((faq) => (
              <FAQItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </View>
        </Animated.View>

        {/* Email footer */}
        <Animated.View
          entering={FadeInUp.duration(300).delay(160)}
          className="mt-8 items-center gap-1 rounded-[16px] border border-[rgba(26,20,16,0.08)] bg-white p-5"
        >
          <Text className="text-[13px] text-[#8A7A6E]">
            You can also reach us directly at
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            <Text className="text-sm font-bold text-[#E8551A]">
              {SUPPORT_EMAIL}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
