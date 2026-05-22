import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";

import { BrText, BrSticker } from "@/components/br";
import { OAuthButton } from "@/components/auth/oauth-button";
import Icon from "@/components/common/icon";
import { BR } from "@/lib/br-theme";
import { openURL } from "expo-linking";

const RING_SIZES = [320, 440, 560] as const;

function FloatCard({
  delay = 0,
  rotate,
  children,
  className,
}: {
  delay?: number;
  rotate: number;
  children: React.ReactNode;
  className?: string;
}) {
  const ty = useSharedValue(0);
  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [ty]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { rotate: `${rotate}deg` }],
  }));
  return (
    <View className={className}>
      <Animated.View
        entering={FadeInUp.duration(600).delay(delay)}
        style={animStyle}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function Twinkle({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(1);
  useEffect(() => {
    const opts = { duration: 1500 + delay * 100 };
    opacity.value = withRepeat(
      withSequence(withTiming(1, opts), withTiming(0.3, opts)),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.4, opts), withTiming(1, opts)),
      -1,
      false,
    );
  }, [opacity, scale, delay]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      className={`absolute rounded-full bg-white/60 ${className ?? ""}`}
      style={animStyle}
    />
  );
}

function HeroBackdrop() {
  return (
    <View
      className="absolute inset-0 overflow-hidden bg-[#E8551A]"
      pointerEvents="none"
    >
      <Text className="absolute -left-10 -top-[60px] font-['BricolageGrotesque_800ExtraBold'] italic text-[520px] leading-[520px] text-white/10 tracking-[-42px]">
        R
      </Text>

      {RING_SIZES.map((size) => (
        <View
          key={size}
          className="absolute top-[62%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white/[0.12]"
          style={{ width: size, height: size }}
        />
      ))}

      <Twinkle className="left-[12%] top-[70%] h-1.5 w-1.5" />
      <Twinkle className="left-[85%] top-[55%] h-2 w-2" delay={3} />
      <Twinkle className="left-[75%] top-[78%] h-[5px] w-[5px]" delay={6} />
      <Twinkle className="left-[20%] top-[45%] h-[5px] w-[5px]" delay={9} />
      <Twinkle className="left-[55%] top-[82%] h-[7px] w-[7px]" delay={12} />

      <FloatCard
        delay={150}
        rotate={-7}
        className="absolute top-[120px] left-6"
      >
        <View className="w-40 rounded-[18px] bg-[#FFFCF6] p-3.5 shadow-2xl">
          <Text className="font-['BricolageGrotesque_700Bold'] text-sm font-bold italic text-[#E8551A]">
            BiteRunr
          </Text>
          <View className="my-1.5 border-t border-dashed border-black/20" />
          <View className="flex-row justify-between">
            <Text className="font-['JetBrainsMono_500Medium'] text-[10px] text-[#4A3C32]">
              Big Mac
            </Text>
            <Text className="font-['JetBrainsMono_500Medium'] text-[10px] text-[#4A3C32]">
              9.99
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="font-['JetBrainsMono_500Medium'] text-[10px] text-[#4A3C32]">
              Fries lg
            </Text>
            <Text className="font-['JetBrainsMono_500Medium'] text-[10px] text-[#4A3C32]">
              3.49
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="font-['JetBrainsMono_500Medium'] text-[10px] text-[#4A3C32]">
              Coke
            </Text>
            <Text className="font-['JetBrainsMono_500Medium'] text-[10px] text-[#4A3C32]">
              2.29
            </Text>
          </View>
          <View className="my-1.5 border-t border-dashed border-black/20" />
          <View className="flex-row justify-between">
            <Text className="font-['JetBrainsMono_500Medium'] text-xs font-bold text-[#4A3C32]">
              Total
            </Text>
            <Text className="font-['JetBrainsMono_500Medium'] text-xs font-bold text-[#4A3C32]">
              $15.77
            </Text>
          </View>
        </View>
      </FloatCard>

      <FloatCard
        delay={400}
        rotate={6}
        className="absolute top-[150px] right-[18px]"
      >
        <View className="w-[168px] rounded-[18px] bg-white p-3.5 shadow-2xl">
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-[#2EBE7B]" />
            <Text className="text-[9px] font-bold tracking-wider text-[#1B6B43]">
              LIVE · 4 IN
            </Text>
          </View>
          <Text className="mt-1.5 font-['BricolageGrotesque_700Bold'] text-base font-bold text-[#1A1410]">
            McDonald's run
          </Text>
          <View className="mt-2.5 flex-row">
            {[
              { i: "JD", bg: "bg-[#FFE7D4]", fg: "text-[#B85A1F]" },
              { i: "AL", bg: "bg-[#E6E2FF]", fg: "text-[#3A2DC2]" },
              { i: "MP", bg: "bg-[#DDF5E8]", fg: "text-[#1B6B43]" },
              { i: "LD", bg: "bg-[#FFE0E6]", fg: "text-[#B82340]" },
            ].map((a, idx) => (
              <View
                key={a.i}
                className={`h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white ${a.bg} ${idx ? "-ml-[7px]" : ""}`}
              >
                <Text className={`text-[9px] font-bold ${a.fg}`}>{a.i}</Text>
              </View>
            ))}
          </View>
          <View className="mt-2.5 h-1 rounded-full bg-[#FFE7D4]">
            <View className="h-full w-3/4 rounded-full bg-[#FF6A1F]" />
          </View>
        </View>
      </FloatCard>
    </View>
  );
}

export default function SignInScreen() {
  return (
    <View className="flex-1 bg-[#E8551A]">
      <StatusBar style="dark" />

      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-1">
          <HeroBackdrop />

          <View className="absolute right-0 bottom-0 left-0 h-[62%] rounded-t-[36px] bg-[#FFF7EE] px-[26px] pt-[26px] pb-8 shadow-2xl">
            <View className="flex-1">
              <BrSticker
                rotate={-3}
                background={BR.yolkSoft}
                leftSlot={<Icon name="Sparkles" size={11} color="#7A4A20" />}
              >
                <BrText weight="bold" className="text-xs">
                  Quick. Easy. Fun.
                </BrText>
              </BrSticker>

              <BrText
                variant="h1"
                className="mt-3.5 text-[36px] leading-[38px]"
              >
                Order with the{"\n"}
                <BrText
                  variant="h1"
                  italic
                  color={BR.orange}
                  className="text-[36px] leading-[38px]"
                >
                  squad.
                </BrText>
              </BrText>
              <BrText className="mt-2 text-sm leading-[21px] text-[#4A3C32]">
                Group orders, voice ordering, and bill splitting, without the
                math.
              </BrText>

              <View className="flex-1" />

              <View className="gap-2.5">
                <Pressable
                  onPress={() => router.push("/(auth)/email-sign-in")}
                  className="h-[55px] w-full flex-row items-center justify-center gap-2 rounded-2xl border border-muted p-4 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Continue with email"
                >
                  <Icon name="Mail" color={BR.ink} size={22} />
                  <Text className="text-lg font-semibold text-[#1A1410]">
                    Continue with email
                  </Text>
                </Pressable>
                <OAuthButton provider="apple" />
                <OAuthButton provider="google" />
                <Text className="mt-1 text-center text-[11px] leading-4 text-[#8A7A6E]">
                  By continuing you agree to BiteRunr's{" "}
                  <Text
                    onPress={() => openURL("https://app.biterunr.com/privacy")}
                    className="underline"
                  >
                    Terms and Privacy
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
