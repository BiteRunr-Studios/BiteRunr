import { useContext } from "react";
import { ScrollView, Text, View, Alert, Pressable, Image } from "react-native";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { AuthContext } from "@/lib/convex-auth-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";
import Icon from "@/components/common/icon";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrAvatar, BrSticker, BrText } from "@/components/br";
import { BR } from "@/lib/br-theme";
import Animated, { FadeInUp } from "react-native-reanimated";
import type { icons } from "lucide-react-native";

type SectionItem = {
  key: string;
  icon: keyof typeof icons;
  label: string;
  sub?: string;
  href?: string;
  danger?: boolean;
  badge?: number;
  onPress?: () => void;
};

type Section = {
  title: string;
  items: SectionItem[];
};

function runnerLevel(runs: number) {
  if (runs >= 50) return 5;
  if (runs >= 30) return 4;
  if (runs >= 15) return 3;
  if (runs >= 6) return 2;
  return 1;
}

export default function AccountTab() {
  const { signOut } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const user = useQuery(api.users.getCurrentUser);
  const pendingCount = useQuery(api.friends.pendingRequestCount);
  const friends = useQuery(api.friends.list);
  const orders = useQuery(api.orders.getWithDetails);
  const isLoading = user === undefined;

  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
    : null;

  const handle = user?.firstName
    ? `@${user.firstName.toLowerCase()}${user.lastName ? user.lastName[0].toLowerCase() : ""}`
    : null;

  const memberSince = user
    ? new Date(user._creationTime).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  const runsCount = orders?.length ?? 0;
  const friendsCount = friends?.length ?? 0;
  const itemsCount =
    orders?.reduce((acc, o) => acc + (o.itemsCount ?? 0), 0) ?? 0;
  const level = runnerLevel(runsCount);

  function onSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Something went wrong.");
          }
        },
      },
    ]);
  }

  const sections: Section[] = [
    {
      title: "Wallet",
      items: [
        {
          key: "payments",
          icon: "CreditCard",
          label: "Payments",
          sub: "View & claim owed amounts",
          href: "/account/payments",
        },
        {
          key: "friends",
          icon: "Users",
          label: "Friends",
          sub: "View, add & manage friends",
          href: "/account/friends",
          badge: pendingCount ?? 0,
        },
      ],
    },
    {
      title: "App",
      items: [
        {
          key: "support",
          icon: "Headset",
          label: "Support",
          sub: "Report an issue",
          href: "/account/support",
        },
        {
          key: "about",
          icon: "Info",
          label: "About",
          sub: "Release notes & about us",
          href: "/account/about",
        },
      ],
    },
    {
      title: "More",
      items: [
        {
          key: "signout",
          icon: "LogOut",
          label: "Sign out",
          danger: true,
          onPress: onSignOut,
        },
      ],
    },
  ];

  return (
    <ErrorBoundary>
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-[18px] pt-3 pb-2">
          <Image
            source={require("@/assets/images/icon-no-bg.png")}
            className="h-11 w-11"
            resizeMode="contain"
          />
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-[#FCEFE0]"
            onPress={() => router.push("/account/account-info")}
          >
            <Icon name="Settings" size={16} color={BR.ink} />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[18px]"
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && <ProfileSkeleton />}

          {!isLoading && user && (
            <Animated.View
              entering={FadeInUp.duration(300)}
              className="gap-2.5"
            >
              {/* Profile hero */}
              <View className="relative mt-2.5 items-center overflow-hidden rounded-[22px] border border-[rgba(255,106,31,0.2)] bg-[#FFF1E2] p-[22px]">
                {/* Level sticker */}
                <View className="absolute right-3 top-3">
                  <BrSticker
                    rotate={4}
                    leftSlot={<Icon name="Flame" size={11} color={BR.orange} />}
                  >
                    <Text>Lvl {level} Runner</Text>
                  </BrSticker>
                </View>

                <BrAvatar
                  name={fullName || "U"}
                  avatarUrl={user.avatarUrl}
                  size={88}
                  ring="#fff"
                />
                <BrText variant="h2" className="mt-3 text-center">
                  {fullName || "Unknown User"}
                </BrText>
                <Text className="mt-1 font-['JetBrainsMono_500Medium'] text-[13px] text-[#E8551A]">
                  {handle} · joined {memberSince}
                </Text>
              </View>

              {/* Stats row */}
              <View className="flex-row gap-2.5">
                <StatCard label="All time runs" value={runsCount} />
                <StatCard label="Friends" value={friendsCount} />
                <StatCard label="Items ordered" value={itemsCount} />
              </View>

              {/* Sections */}
              {sections.map((sec, si) => (
                <Animated.View
                  key={sec.title}
                  entering={FadeInUp.duration(300).delay(60 + si * 25)}
                  className="mt-3"
                >
                  <BrText variant="eyebrow" className="mb-2">
                    {sec.title}
                  </BrText>
                  <View className="overflow-hidden rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white">
                    {sec.items.map((item, i) => (
                      <Pressable
                        key={item.key}
                        onPress={
                          item.onPress ?? (() => router.push(item.href as any))
                        }
                        className={`active:opacity-[0.82] ${
                          i < sec.items.length - 1
                            ? "border-b border-b-[rgba(26,20,16,0.08)]"
                            : ""
                        }`}
                      >
                        <View className="flex-row items-center gap-3 p-3.5">
                          <View
                            className={`h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${
                              item.danger ? "bg-[#FFE0E6]" : "bg-[#FCEFE0]"
                            }`}
                          >
                            <Icon
                              name={item.icon}
                              size={16}
                              color={item.danger ? BR.coralInk : BR.ink2}
                            />
                          </View>

                          <View className="flex-1">
                            <Text
                              className={`text-sm font-semibold ${
                                item.danger
                                  ? "text-[#B82340]"
                                  : "text-[#1A1410]"
                              }`}
                            >
                              {item.label}
                            </Text>
                            {item.sub ? (
                              <Text className="mt-px text-[11px] text-[#8A7A6E]">
                                {item.sub}
                              </Text>
                            ) : null}
                          </View>

                          {typeof item.badge === "number" && item.badge > 0 && (
                            <View className="h-5 min-w-5 items-center justify-center rounded-full bg-[#FF4D6D] px-[5px]">
                              <Text className="text-[10px] font-bold text-white">
                                {item.badge > 9 ? "9+" : item.badge}
                              </Text>
                            </View>
                          )}

                          {!item.danger && (
                            <Icon
                              name="ChevronRight"
                              size={16}
                              color={BR.ink3}
                            />
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {!isLoading && !user && (
            <View className="mt-6 items-center rounded-[22px] border border-dashed border-[rgba(26,20,16,0.14)] bg-white px-6 py-10">
              <Text className="text-[40px]">👤</Text>
              <BrText variant="h3" className="mt-3">
                Not signed in
              </BrText>
              <BrText className="mt-1 text-center text-[13px] text-[#8A7A6E]">
                Please sign in to see your profile.
              </BrText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5">
      <Text className="font-['JetBrainsMono_700Bold'] text-2xl text-[#1A1410]">
        {value}
      </Text>
      <Text className="text-center text-[11px] text-[#8A7A6E]">{label}</Text>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <Skeleton>
      <View className="gap-2.5">
        <View className="relative mt-2.5 items-center overflow-hidden rounded-[22px] border border-[rgba(255,106,31,0.2)] bg-[#FFF1E2] p-[22px]">
          <SkeletonBlock width={88} height={88} rounded="rounded-full" />
          <View className="mt-3 items-center gap-2">
            <SkeletonBlock width={160} height={22} />
            <SkeletonBlock width={130} height={14} />
          </View>
        </View>
        <View className="flex-row gap-2.5">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className="flex-1 items-center gap-1 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3.5"
            >
              <SkeletonBlock width={40} height={24} />
              <SkeletonBlock width={60} height={12} />
            </View>
          ))}
        </View>
        {[1, 2].map((i) => (
          <View key={i} className="mt-3">
            <SkeletonBlock width={80} height={12} className="mb-2" />
            <View className="overflow-hidden rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white">
              {[1, 2].map((j) => (
                <View
                  key={j}
                  className={`flex-row items-center gap-3 p-3.5 ${
                    j === 1 ? "border-b border-b-[rgba(26,20,16,0.08)]" : ""
                  }`}
                >
                  <SkeletonBlock width={34} height={34} rounded="rounded-xl" />
                  <View className="ml-3 flex-1 gap-1.5">
                    <SkeletonBlock width={120} height={14} />
                    <SkeletonBlock width={160} height={11} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Skeleton>
  );
}
