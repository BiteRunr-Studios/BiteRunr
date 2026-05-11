import { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Linking,
} from "react-native";
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
import { BR, BR_FONT } from "@/lib/br-theme";
import { openURL } from "expo-linking";

const { width: SCREEN_W } = Dimensions.get("window");

function FloatCard({
  delay = 0,
  rotate,
  children,
  style,
}: {
  delay?: number;
  rotate: number;
  children: React.ReactNode;
  style?: object;
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
    <Animated.View
      entering={FadeInUp.duration(600).delay(delay)}
      style={[animStyle, style]}
    >
      {children}
    </Animated.View>
  );
}

function Twinkle({
  left,
  top,
  size,
  delay = 0,
}: {
  left: number | string;
  top: number | string;
  size: number;
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
      style={[
        {
          position: "absolute",
          left: left as number,
          top: top as number,
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.6)",
        },
        animStyle,
      ]}
    />
  );
}

function HeroBackdrop() {
  return (
    <View style={styles.hero} pointerEvents="none">
      {/* Huge italic R watermark */}
      <Text style={styles.watermark}>R</Text>

      {/* Concentric rings */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.ring,
            {
              width: 320 + i * 120,
              height: 320 + i * 120,
              left: SCREEN_W / 2 - (320 + i * 120) / 2,
              top: "62%",
              marginTop: -(320 + i * 120) / 2,
            },
          ]}
        />
      ))}

      <Twinkle left="12%" top="70%" size={6} />
      <Twinkle left="85%" top="55%" size={8} delay={3} />
      <Twinkle left="75%" top="78%" size={5} delay={6} />
      <Twinkle left="20%" top="45%" size={5} delay={9} />
      <Twinkle left="55%" top="82%" size={7} delay={12} />

      {/* Floating receipt card */}
      <FloatCard
        delay={150}
        rotate={-7}
        style={{ position: "absolute", top: 120, left: 24 }}
      >
        <View style={styles.receiptCard}>
          <Text style={styles.receiptBrand}>BiteRunr</Text>
          <View style={styles.receiptDash} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptText}>Big Mac</Text>
            <Text style={styles.receiptText}>9.99</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptText}>Fries lg</Text>
            <Text style={styles.receiptText}>3.49</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptText}>Coke</Text>
            <Text style={styles.receiptText}>2.29</Text>
          </View>
          <View style={styles.receiptDash} />
          <View style={styles.receiptRow}>
            <Text
              style={[styles.receiptText, { fontWeight: "700", fontSize: 12 }]}
            >
              Total
            </Text>
            <Text
              style={[styles.receiptText, { fontWeight: "700", fontSize: 12 }]}
            >
              $15.77
            </Text>
          </View>
        </View>
      </FloatCard>

      {/* Floating live order card */}
      <FloatCard
        delay={400}
        rotate={6}
        style={{ position: "absolute", top: 150, right: 18 }}
      >
        <View style={styles.orderCard}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE · 4 IN</Text>
          </View>
          <Text style={styles.orderName}>McDonald's run</Text>
          <View style={styles.avatarRow}>
            {[
              { i: "JD", bg: "#FFE7D4", fg: "#B85A1F" },
              { i: "AL", bg: "#E6E2FF", fg: "#3A2DC2" },
              { i: "MP", bg: "#DDF5E8", fg: "#1B6B43" },
              { i: "LD", bg: "#FFE0E6", fg: "#B82340" },
            ].map((a, idx) => (
              <View
                key={a.i}
                style={[
                  styles.miniAvatar,
                  { backgroundColor: a.bg, marginLeft: idx ? -7 : 0 },
                ]}
              >
                <Text style={[styles.miniAvatarText, { color: a.fg }]}>
                  {a.i}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.miniProgress}>
            <View style={styles.miniProgressFill} />
          </View>
        </View>
      </FloatCard>
    </View>
  );
}

export default function SignInScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BR.orangeDeep }}>
      {/* Light status bar for the dark orange hero */}
      <StatusBar style="light" />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ flex: 1 }}>
          {/* Hero: full-screen orange background */}
          <HeroBackdrop />

          {/* Bottom paper sheet */}
          <View style={styles.sheet}>
            <View style={{ flex: 1 }}>
              <BrSticker
                rotate={-3}
                background={BR.yolkSoft}
                leftSlot={<Icon name="Sparkles" size={11} color="#7A4A20" />}
              >
                <BrText weight="bold" style={{ fontSize: 12 }}>
                  Quick. Easy. Fun.
                </BrText>
              </BrSticker>

              <BrText
                variant="h1"
                style={{ fontSize: 36, marginTop: 14, lineHeight: 38 }}
              >
                Order with the{"\n"}
                <BrText
                  variant="h1"
                  italic
                  color={BR.orange}
                  style={{ fontSize: 36, lineHeight: 38 }}
                >
                  squad.
                </BrText>
              </BrText>
              <BrText
                style={{
                  fontSize: 14,
                  color: BR.ink2,
                  marginTop: 8,
                  lineHeight: 21,
                }}
              >
                Group orders, voice ordering, and bill splitting, without the
                math.
              </BrText>

              <View style={{ flex: 1 }} />

              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => router.push("/(auth)/email-sign-in")}
                  className="flex-row gap-2 justify-center items-center p-4 w-full rounded-2xl border h-[55px] border-muted active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Continue with email"
                >
                  <Icon name="Mail" color={BR.ink} size={22} />
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: BR.ink }}
                  >
                    Continue with email
                  </Text>
                </Pressable>
                <OAuthButton provider="apple" />
                <OAuthButton provider="google" />
                <Text style={styles.legalText}>
                  By continuing you agree to BiteRunr's{" "}
                  <Text
                    onPress={() => openURL("https://app.biterunr.com/privacy")}
                    style={{ textDecorationLine: "underline" }}
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

const styles = StyleSheet.create({
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BR.orangeDeep,
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    left: -40,
    top: -60,
    fontFamily: BR_FONT.displayExtraBold,
    fontStyle: "italic",
    fontSize: 520,
    lineHeight: 520,
    color: "rgba(255,255,255,0.10)",
    letterSpacing: -42,
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  receiptCard: {
    width: 160,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFCF6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  receiptBrand: {
    fontFamily: BR_FONT.display,
    fontStyle: "italic",
    fontSize: 14,
    fontWeight: "700",
    color: BR.orangeDeep,
  },
  receiptDash: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.2)",
    borderStyle: "dashed",
    marginVertical: 6,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptText: {
    fontFamily: BR_FONT.mono,
    fontSize: 10,
    color: BR.ink2,
  },
  orderCard: {
    width: 168,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 14,
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: BR.mint,
  },
  liveText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: BR.mintInk,
  },
  orderName: {
    fontFamily: BR_FONT.display,
    fontWeight: "700",
    fontSize: 16,
    marginTop: 6,
    color: BR.ink,
  },
  avatarRow: { flexDirection: "row", marginTop: 10 },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  miniAvatarText: { fontSize: 9, fontWeight: "700" },
  miniProgress: {
    marginTop: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: BR.orangeSoft,
  },
  miniProgressFill: {
    width: "75%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: BR.orange,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "62%",
    backgroundColor: BR.paper,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  legalText: {
    fontSize: 11,
    color: BR.ink3,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
});
