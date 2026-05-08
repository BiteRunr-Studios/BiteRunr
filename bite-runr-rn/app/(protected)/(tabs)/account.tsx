import { useContext } from "react";
import {
  ScrollView,
  Text,
  View,
  Alert,
  Pressable,
  Image,
  StyleSheet,
} from "react-native";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { AuthContext } from "@/lib/convex-auth-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";
import Icon from "@/components/common/icon";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrAvatar, BrSticker, BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS } from "@/lib/br-theme";
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
  const itemsCount = orders?.reduce((acc, o) => acc + (o.itemsCount ?? 0), 0) ?? 0;
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
        { key: "payments", icon: "CreditCard", label: "Payments", sub: "View & claim owed amounts", href: "/account/payments" },
        { key: "friends", icon: "Users", label: "Friends", sub: "View, add & manage friends", href: "/account/friends", badge: pendingCount ?? 0 },
      ],
    },
    {
      title: "App",
      items: [
        { key: "support", icon: "Headset", label: "Support", sub: "Report an issue", href: "/account/support" },
        { key: "about", icon: "Info", label: "About", sub: "Release notes & about us", href: "/account/about" },
      ],
    },
    {
      title: "More",
      items: [
        { key: "signout", icon: "LogOut", label: "Sign out", danger: true, onPress: onSignOut },
      ],
    },
  ];

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: BR.paper, paddingTop: insets.top }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/icon-no-bg.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
          <Pressable style={styles.iconBtn} onPress={() => router.push("/account/account-info")}>
            <Icon name="Settings" size={16} color={BR.ink} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 50 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && <ProfileSkeleton />}

          {!isLoading && user && (
            <Animated.View entering={FadeInUp.duration(400)} style={{ gap: 10 }}>
              {/* Profile hero */}
              <View style={styles.profileHero}>
                {/* Level sticker */}
                <View style={styles.stickerWrap}>
                  <BrSticker rotate={4}>
                    <Icon name="Flame" size={11} color={BR.orange} />
                    {"  "}Lvl {level} Runner
                  </BrSticker>
                </View>

                <BrAvatar
                  name={fullName || "U"}
                  avatarUrl={user.avatarUrl}
                  size={88}
                  ring="#fff"
                />
                <BrText variant="h2" style={{ marginTop: 12, textAlign: "center" }}>
                  {fullName || "Unknown User"}
                </BrText>
                <Text style={styles.heroHandle}>
                  {handle} · joined {memberSince}
                </Text>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <StatCard label="Runs" value={runsCount} sub="all time" />
                <StatCard label="Squad" value={friendsCount} sub="friends" />
                <StatCard label="Items" value={itemsCount} sub="ordered" />
              </View>

              {/* Sections */}
              {sections.map((sec, si) => (
                <Animated.View
                  key={sec.title}
                  entering={FadeInUp.duration(400).delay(100 + si * 50)}
                  style={{ marginTop: 12 }}
                >
                  <BrText variant="eyebrow" style={{ marginBottom: 8 }}>{sec.title}</BrText>
                  <View style={styles.sectionCard}>
                    {sec.items.map((item, i) => (
                      <Pressable
                        key={item.key}
                        onPress={item.onPress ?? (() => router.push(item.href as any))}
                        style={({ pressed }) => [
                          i < sec.items.length - 1 && styles.sectionRowBorder,
                          pressed && { opacity: 0.82 },
                        ]}
                      >
                        <View style={styles.sectionRow}>
                          <View style={[
                            styles.rowIcon,
                            { backgroundColor: item.danger ? BR.coralSoft : BR.paper2 },
                          ]}>
                            <Icon
                              name={item.icon}
                              size={16}
                              color={item.danger ? BR.coralInk : BR.ink2}
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={[styles.rowLabel, item.danger && { color: BR.coralInk }]}>
                              {item.label}
                            </Text>
                            {item.sub ? (
                              <Text style={styles.rowSub}>{item.sub}</Text>
                            ) : null}
                          </View>

                          {typeof item.badge === "number" && item.badge > 0 && (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>
                                {item.badge > 9 ? "9+" : item.badge}
                              </Text>
                            </View>
                          )}

                          {!item.danger && (
                            <Icon name="ChevronRight" size={16} color={BR.ink3} />
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
            <View style={styles.notSignedIn}>
              <Text style={{ fontSize: 40 }}>👤</Text>
              <BrText variant="h3" style={{ marginTop: 12 }}>Not signed in</BrText>
              <BrText style={{ fontSize: 13, color: BR.ink3, marginTop: 4, textAlign: "center" }}>
                Please sign in to see your profile.
              </BrText>
            </View>
          )}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label} · {sub}</Text>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <Skeleton>
      <View style={{ gap: 10 }}>
        <View style={[styles.profileHero, { alignItems: "center" }]}>
          <SkeletonBlock width={88} height={88} rounded="rounded-full" />
          <View style={{ marginTop: 12, gap: 8, alignItems: "center" }}>
            <SkeletonBlock width={160} height={22} />
            <SkeletonBlock width={130} height={14} />
          </View>
        </View>
        <View style={styles.statsRow}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.statCard, { flex: 1 }]}>
              <SkeletonBlock width={40} height={24} />
              <SkeletonBlock width={60} height={12} />
            </View>
          ))}
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={{ marginTop: 12 }}>
            <SkeletonBlock width={80} height={12} style={{ marginBottom: 8 }} />
            <View style={styles.sectionCard}>
              {[1, 2].map((j) => (
                <View key={j} style={[styles.sectionRow, j === 1 && styles.sectionRowBorder]}>
                  <SkeletonBlock width={34} height={34} rounded="rounded-xl" />
                  <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
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

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHero: {
    backgroundColor: BR.orangeTint,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,106,31,0.2)",
    padding: 22,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    marginTop: 10,
  },
  stickerWrap: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  heroHandle: {
    fontSize: 13,
    fontFamily: BR_FONT.mono,
    color: BR.orangeDeep,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: BR_FONT.monoBold,
    fontSize: 24,
    color: BR.ink,
  },
  statLabel: {
    fontSize: 11,
    color: BR.ink3,
    textAlign: "center",
  },
  sectionCard: {
    backgroundColor: BR.card,
    borderRadius: BR_RADIUS.md,
    borderWidth: 1,
    borderColor: BR.line,
    overflow: "hidden",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  sectionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BR.line,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: BR.ink,
  },
  rowSub: {
    fontSize: 11,
    color: BR.ink3,
    marginTop: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: BR.coral,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  notSignedIn: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginTop: 24,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: BR.line2,
    backgroundColor: BR.card,
  },
});
