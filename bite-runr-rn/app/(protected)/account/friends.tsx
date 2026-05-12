import React, { useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrText } from "@/components/br";
import { AnimatedPressable } from "@/components/common/animated-pressable";
import { Avatar } from "@/components/common/avatar";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { FONTS, COLORS } from "@/lib/fonts";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import type { icons } from "lucide-react-native";

type Tab = "friends" | "requests" | "search";

const SQUAD_COLORS: {
  key: string;
  bg: string;
  deep: string;
  icon: keyof typeof icons;
}[] = [
  { key: "orange", bg: COLORS.orange, deep: COLORS.orangeDeep, icon: "Flame" },
  { key: "lilac", bg: COLORS.lilac, deep: "#3A2DC2", icon: "Briefcase" },
  { key: "mint", bg: COLORS.mint, deep: COLORS.mintDeep, icon: "House" },
  { key: "coral", bg: COLORS.coral, deep: COLORS.coralDeep, icon: "Heart" },
  { key: "yolk", bg: COLORS.yolk, deep: "#B27500", icon: "Star" },
];

// ─── Tab pill ──────────────────────────────────────────────────────
function TabPill({
  label,
  active,
  badge,
  onPress,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      scale={0.93}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? COLORS.ink : COLORS.paper2,
        borderWidth: 1,
        borderColor: active ? COLORS.ink : COLORS.line,
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.display.bold,
          fontSize: 13,
          color: active ? "#fff" : COLORS.ink2,
        }}
      >
        {label}
      </Text>
      {!!badge && badge > 0 && (
        <View
          style={{
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: COLORS.coral,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{ fontFamily: FONTS.mono.bold, fontSize: 10, color: "#fff" }}
          >
            {badge > 9 ? "9+" : badge}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

// ─── Create Squad Sheet ────────────────────────────────────────────
function CreateSquadSheet({
  visible,
  onClose,
  friends,
}: {
  visible: boolean;
  onClose: () => void;
  friends: {
    id: Id<"users">;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }[];
}) {
  const createSquad = useMutation(api.squads.create);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState("orange");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);

  const colorDef =
    SQUAD_COLORS.find((c) => c.key === selectedColor) ?? SQUAD_COLORS[0];

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give your squad a name.");
      return;
    }
    setSaving(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await createSquad({
        name: name.trim(),
        color: selectedColor,
        icon: colorDef.icon,
        memberIds: [...selectedMembers] as Id<"users">[],
      });
      setName("");
      setSelectedColor("orange");
      setSelectedMembers(new Set());
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create squad");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName("");
    setSelectedColor("orange");
    setSelectedMembers(new Set());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
          {/* Handle + header */}
          <View
            style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.line2,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 18,
              paddingVertical: 14,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colorDef.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={colorDef.icon} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: FONTS.display.bold,
                  fontSize: 22,
                  letterSpacing: -0.4,
                  color: COLORS.ink,
                }}
              >
                Create a{" "}
                <Text style={{ color: COLORS.orange, fontStyle: "italic" }}>
                  squad
                </Text>
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.ink3, marginTop: 1 }}>
                Reusable group for fast runs & splits
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: COLORS.paper2,
                borderWidth: 1,
                borderColor: COLORS.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="X" size={15} color={COLORS.ink} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text
              style={{
                fontFamily: FONTS.mono.semibold,
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: COLORS.ink3,
                marginBottom: 8,
              }}
            >
              Squad name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Lunch crew, Roomies…"
              placeholderTextColor={COLORS.ink3}
              style={{
                fontFamily: FONTS.display.medium,
                fontSize: 18,
                letterSpacing: 0,
                color: COLORS.ink,
                backgroundColor: "#fff",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: COLORS.line,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 20,
              }}
            />

            {/* Color picker */}
            <Text
              style={{
                fontFamily: FONTS.mono.semibold,
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: COLORS.ink3,
                marginBottom: 10,
              }}
            >
              Pick a vibe
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 22 }}>
              {SQUAD_COLORS.map((c) => {
                const isSelected = selectedColor === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setSelectedColor(c.key)}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 14,
                      backgroundColor: c.bg,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isSelected ? 3 : 2,
                      borderColor: isSelected ? COLORS.ink : "transparent",
                      shadowColor: isSelected ? COLORS.ink : "transparent",
                      shadowOffset: { width: 2, height: 2 },
                      shadowOpacity: isSelected ? 1 : 0,
                      shadowRadius: 0,
                    }}
                  >
                    <Icon name={c.icon} size={18} color="#fff" />
                  </Pressable>
                );
              })}
            </View>

            {/* Friend selector */}
            <Text
              style={{
                fontFamily: FONTS.mono.semibold,
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: COLORS.ink3,
                marginBottom: 10,
              }}
            >
              Add friends
            </Text>
            {friends.length === 0 ? (
              <Text
                style={{ fontSize: 13, color: COLORS.ink3, marginBottom: 20 }}
              >
                Add some friends first to include them in a squad.
              </Text>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                {friends.map((f) => {
                  const isSelected = selectedMembers.has(f.id);
                  const fullName = `${f.firstName} ${f.lastName}`;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => toggleMember(f.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                        paddingRight: 12,
                        paddingLeft: 6,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: isSelected ? COLORS.ink : "#fff",
                        borderWidth: 1,
                        borderColor: isSelected ? COLORS.ink : COLORS.line,
                      }}
                    >
                      <Avatar
                        name={fullName}
                        avatarUrl={f.avatarUrl}
                        size={24}
                      />
                      <Text
                        style={{
                          fontFamily: FONTS.display.semibold,
                          fontSize: 13,
                          color: isSelected ? "#fff" : COLORS.ink,
                        }}
                      >
                        {f.firstName}
                      </Text>
                      {isSelected && (
                        <Icon name="Check" size={12} color="#fff" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* CTA */}
            <AnimatedPressable
              scale={0.97}
              onPress={handleCreate}
              disabled={saving}
              style={{
                height: 54,
                borderRadius: 16,
                backgroundColor: COLORS.orange,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 10,
                opacity: saving ? 0.65 : 1,
                shadowColor: COLORS.orange,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="Sparkles" size={16} color="#fff" />
                  <Text
                    style={{
                      fontFamily: FONTS.display.bold,
                      fontSize: 16,
                      color: "#fff",
                    }}
                  >
                    Create squad
                  </Text>
                </>
              )}
            </AnimatedPressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Friends tab ───────────────────────────────────────────────────
function FriendsTab({ pendingCount }: { pendingCount: number }) {
  const friends = useQuery(api.friends.list);
  const requests = useQuery(api.friends.listPendingRequests);
  const removeFriend = useMutation(api.friends.removeFriend);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered =
    friends?.filter((f) => {
      if (!search) return true;
      const full = `${f.firstName} ${f.lastName}`.toLowerCase();
      return full.includes(search.toLowerCase());
    }) ?? [];

  const handleRemove = (id: Id<"users">, name: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Remove Friend", `Remove ${name} from your friends?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRemovingId(id);
          try {
            await removeFriend({ friendId: id });
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to remove friend");
          } finally {
            setRemovingId(null);
          }
        },
      },
    ]);
  };

  if (friends === undefined) {
    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: 32,
          gap: 10,
        }}
      >
        <Skeleton>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBlock
              key={i}
              width="100%"
              height={68}
              rounded="rounded-2xl"
            />
          ))}
        </Skeleton>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Pending request banner */}
      {pendingCount > 0 && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            onPress={() => {
              /* parent handles tab switch — pass via prop below */
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 16,
              backgroundColor: COLORS.orangeTint,
              borderWidth: 1,
              borderColor: "rgba(255,106,31,0.2)",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row" }}>
              {(requests ?? []).slice(0, 3).map((r, j) => (
                <View
                  key={r.id}
                  style={{
                    marginLeft: j > 0 ? -10 : 0,
                    borderRadius: 999,
                    shadowColor: COLORS.orangeTint,
                    shadowRadius: 0,
                  }}
                >
                  <Avatar
                    name={`${r.sender?.firstName} ${r.sender?.lastName}`}
                    avatarUrl={r.sender?.avatarUrl}
                    size={28}
                  />
                </View>
              ))}
            </View>
            <Text
              style={{
                fontFamily: FONTS.display.semibold,
                fontSize: 13,
                color: COLORS.orangeDeep,
                flex: 1,
              }}
            >
              {pendingCount} new friend{" "}
              {pendingCount === 1 ? "request" : "requests"}
            </Text>
            <Icon name="ChevronRight" size={16} color={COLORS.orange} />
          </Pressable>
        </Animated.View>
      )}

      {/* Search bar */}
      {(friends?.length ?? 0) > 3 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#fff",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: COLORS.line,
            paddingHorizontal: 12,
            height: 42,
            marginBottom: 12,
          }}
        >
          <Icon name="Search" size={15} color={COLORS.ink3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search friends…"
            placeholderTextColor={COLORS.ink3}
            style={{
              flex: 1,
              fontFamily: FONTS.display.medium,
              fontSize: 14,
              letterSpacing: 0,
              color: COLORS.ink,
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Icon name="X" size={14} color={COLORS.ink3} />
            </Pressable>
          )}
        </View>
      )}

      {friends.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            paddingTop: 48,
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: COLORS.paper2,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Icon name="Users" size={28} color={COLORS.ink3} />
          </View>
          <Text
            style={{
              fontFamily: FONTS.display.bold,
              fontSize: 17,
              color: COLORS.ink,
            }}
          >
            No friends yet
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.ink3,
              textAlign: "center",
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            Search for people to add them as friends and start ordering together
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 32 }}>
          <Text style={{ fontSize: 13, color: COLORS.ink3 }}>
            No friends matching "{search}"
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {filtered.map((friend, i) => {
            const fullName = `${friend.firstName} ${friend.lastName}`;
            return (
              <Animated.View
                key={friend.id}
                entering={FadeInUp.duration(300).delay(i * 40)}
              >
                <AnimatedPressable
                  scale={0.98}
                  onLongPress={() =>
                    handleRemove(
                      friend.id,
                      `${friend.firstName} ${friend.lastName}`,
                    )
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    backgroundColor: COLORS.orangeTint,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "rgba(255,106,31,0.2)",
                  }}
                >
                  <Avatar
                    name={fullName}
                    avatarUrl={friend.avatarUrl}
                    size={46}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.display.bold,
                        fontSize: 15,
                        color: COLORS.ink,
                      }}
                    >
                      {fullName}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      <Icon name="UserCheck" size={11} color={COLORS.mint} />
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.mint,
                          fontFamily: FONTS.display.semibold,
                        }}
                      >
                        Friends
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleRemove(friend.id, fullName)}
                    disabled={removingId === friend.id}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: COLORS.line,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {removingId === friend.id ? (
                      <ActivityIndicator size="small" color={COLORS.ink3} />
                    ) : (
                      <Icon name="X" size={16} color={COLORS.ink} />
                    )}
                  </Pressable>
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Requests tab ──────────────────────────────────────────────────
function RequestsTab() {
  const requests = useQuery(api.friends.listPendingRequests);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const rejectRequest = useMutation(api.friends.rejectRequest);
  const [processing, setProcessing] = useState<{
    id: string;
    action: "accept" | "reject";
  } | null>(null);

  const handleAccept = async (id: Id<"friendRequests">) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setProcessing({ id, action: "accept" });
    try {
      await acceptRequest({ requestId: id });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to accept");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: Id<"friendRequests">) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProcessing({ id, action: "reject" });
    try {
      await rejectRequest({ requestId: id });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to decline");
    } finally {
      setProcessing(null);
    }
  };

  if (requests === undefined) {
    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: 32,
          gap: 10,
        }}
      >
        <Skeleton>
          {[1, 2].map((i) => (
            <SkeletonBlock
              key={i}
              width="100%"
              height={100}
              rounded="rounded-2xl"
            />
          ))}
        </Skeleton>
      </ScrollView>
    );
  }

  if (requests.length === 0) {
    return (
      <View
        style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 24 }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: COLORS.paper2,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Icon name="Bell" size={28} color={COLORS.ink3} />
        </View>
        <Text
          style={{
            fontFamily: FONTS.display.bold,
            fontSize: 17,
            color: COLORS.ink,
          }}
        >
          No pending requests
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.ink3,
            textAlign: "center",
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          When someone sends you a friend request, it will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontFamily: FONTS.mono.semibold,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: COLORS.ink3,
          marginBottom: 10,
        }}
      >
        {requests.length} pending
      </Text>
      <View style={{ gap: 10 }}>
        {requests.map((req, i) => {
          if (!req.sender) return null;
          const fullName = `${req.sender.firstName} ${req.sender.lastName}`;
          const isAccepting =
            processing?.id === req.id && processing.action === "accept";
          const isRejecting =
            processing?.id === req.id && processing.action === "reject";
          const isProcessing = isAccepting || isRejecting;
          return (
            <Animated.View
              key={req.id}
              entering={FadeInUp.duration(300).delay(i * 50)}
            >
              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: COLORS.orangeTint,
                  borderWidth: 1,
                  borderColor: "rgba(255,106,31,0.2)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View style={{ position: "relative" }}>
                    <Avatar
                      name={fullName}
                      avatarUrl={req.sender.avatarUrl}
                      size={48}
                    />
                    <View
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: COLORS.orange,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: COLORS.orangeTint,
                      }}
                    >
                      <Icon name="UserPlus" size={10} color="#fff" />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.display.bold,
                        fontSize: 15,
                        color: COLORS.ink,
                      }}
                    >
                      {fullName}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: COLORS.ink3, marginTop: 2 }}
                    >
                      Wants to be your friend
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <AnimatedPressable
                      scale={0.9}
                      onPress={() => handleReject(req.id)}
                      disabled={isProcessing}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: "#fff",
                        borderWidth: 1.5,
                        borderColor: COLORS.line2,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isRejecting ? (
                        <ActivityIndicator size="small" color={COLORS.ink3} />
                      ) : (
                        <Icon
                          name="X"
                          size={18}
                          color={COLORS.ink2}
                          strokeWidth={2.5}
                        />
                      )}
                    </AnimatedPressable>
                    <AnimatedPressable
                      scale={0.9}
                      onPress={() => handleAccept(req.id)}
                      disabled={isProcessing}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: COLORS.mint,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isAccepting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Icon
                          name="Check"
                          size={18}
                          color="#fff"
                          strokeWidth={3}
                        />
                      )}
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Search users tab ──────────────────────────────────────────────
function SearchTab() {
  const [query, setQuery] = useState("");
  const searchResults = useQuery(
    api.friends.searchUsers,
    query.length >= 2 ? { query } : "skip",
  );
  const sendRequest = useMutation(api.friends.sendRequest);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const handleAdd = async (userId: Id<"users">, name: string) => {
    setSendingTo(userId);
    try {
      await sendRequest({ receiverId: userId });
      Alert.alert("Request Sent", `Friend request sent to ${name}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send request");
    } finally {
      setSendingTo(null);
    }
  };

  const isSearching = query.length >= 2 && searchResults === undefined;

  return (
    <View style={{ flex: 1, paddingHorizontal: 18 }}>
      {/* Search input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: "#fff",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: COLORS.line,
          paddingHorizontal: 12,
          height: 46,
          marginBottom: 16,
        }}
      >
        <Icon name="Search" size={16} color={COLORS.ink3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email…"
          placeholderTextColor={COLORS.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            fontFamily: FONTS.display.medium,
            fontSize: 14,
            letterSpacing: 0,
            color: COLORS.ink,
          }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Icon name="X" size={14} color={COLORS.ink3} />
          </Pressable>
        )}
      </View>

      {query.length < 2 && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: COLORS.paper2,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Icon name="Search" size={28} color={COLORS.ink3} />
          </View>
          <Text
            style={{
              fontFamily: FONTS.display.bold,
              fontSize: 17,
              color: COLORS.ink,
            }}
          >
            Find Friends
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.ink3,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Enter at least 2 characters to search
          </Text>
        </View>
      )}

      {isSearching && (
        <Skeleton>
          <View style={{ gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonBlock
                key={i}
                width="100%"
                height={68}
                rounded="rounded-2xl"
              />
            ))}
          </View>
        </Skeleton>
      )}

      {query.length >= 2 && searchResults && searchResults.length === 0 && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: COLORS.paper2,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Icon name="UserX" size={28} color={COLORS.ink3} />
          </View>
          <Text
            style={{
              fontFamily: FONTS.display.bold,
              fontSize: 17,
              color: COLORS.ink,
            }}
          >
            No users found
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.ink3, marginTop: 6 }}>
            Try a different name or email
          </Text>
        </View>
      )}

      {searchResults && searchResults.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
        >
          {searchResults.map((user, i) => {
            const fullName = `${user.firstName} ${user.lastName}`;
            return (
              <Animated.View
                key={user.id}
                entering={FadeInUp.duration(250).delay(i * 40)}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: COLORS.line,
                  }}
                >
                  <Avatar
                    name={fullName}
                    avatarUrl={user.avatarUrl}
                    size={46}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.display.bold,
                        fontSize: 15,
                        color: COLORS.ink,
                      }}
                    >
                      {fullName}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: COLORS.ink3, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {user.email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAdd(user.id, fullName)}
                    disabled={sendingTo === user.id}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: COLORS.ink,
                    }}
                  >
                    {sendingTo === user.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="UserPlus" size={14} color="#fff" />
                        <Text
                          style={{
                            fontFamily: FONTS.display.semibold,
                            fontSize: 13,
                            color: "#fff",
                          }}
                        >
                          Add
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Root screen ───────────────────────────────────────────────────
export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: Tab }>();
  const [activeTab, setActiveTab] = useState<Tab>(tab ?? "friends");
  const [showCreateSquad, setShowCreateSquad] = useState(false);

  const pendingCount = useQuery(api.friends.pendingRequestCount) ?? 0;
  const friends = useQuery(api.friends.list) ?? [];

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: COLORS.paper }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingVertical: 10,
          position: "relative",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: COLORS.paper2,
            borderWidth: 1,
            borderColor: COLORS.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="ChevronLeft" size={20} color={COLORS.ink} />
        </Pressable>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 10,
            bottom: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
          pointerEvents="none"
        >
          <BrText weight="bold" style={{ fontSize: 17, lineHeight: 24 }}>
            Friends
          </BrText>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab row */}
      <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <TabPill
            label={`Friends · ${friends.length}`}
            active={activeTab === "friends"}
            onPress={() => setActiveTab("friends")}
          />
          <TabPill
            label="Requests"
            active={activeTab === "requests"}
            badge={pendingCount}
            onPress={() => setActiveTab("requests")}
          />
          <TabPill
            label="Search"
            active={activeTab === "search"}
            onPress={() => setActiveTab("search")}
          />
        </ScrollView>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "friends" && <FriendsTab pendingCount={pendingCount} />}
        {activeTab === "requests" && <RequestsTab />}
        {activeTab === "search" && <SearchTab />}
      </View>

      <CreateSquadSheet
        visible={showCreateSquad}
        onClose={() => setShowCreateSquad(false)}
        friends={friends}
      />
    </SafeAreaView>
  );
}
