import { useState } from "react";
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
import type { Id } from "@/convex/_generated/dataModel";
import Icon from "@/components/common/icon";
import { BrText } from "@/components/br";
import { AnimatedPressable } from "@/components/common/animated-pressable";
import { Avatar } from "@/components/common/avatar";
import { Skeleton, SkeletonBlock } from "@/components/common/skeleton";
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import type { icons } from "lucide-react-native";

type Tab = "friends" | "requests" | "search";

const SQUAD_BG_CLASS: Record<string, string> = {
  orange: "bg-[#FF6A1F]",
  lilac: "bg-[#6E5BFF]",
  mint: "bg-[#2EBE7B]",
  coral: "bg-[#FF4D6D]",
  yolk: "bg-[#FFC542]",
};

const SQUAD_COLORS: { key: string; icon: keyof typeof icons }[] = [
  { key: "orange", icon: "Flame" },
  { key: "lilac", icon: "Briefcase" },
  { key: "mint", icon: "House" },
  { key: "coral", icon: "Heart" },
  { key: "yolk", icon: "Star" },
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
      className={`flex-row items-center gap-[5px] rounded-full border px-3.5 py-2 ${
        active
          ? "border-[#1A1410] bg-[#1A1410]"
          : "border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
      }`}
    >
      <Text
        className={`font-['BricolageGrotesque_700Bold'] text-[13px] ${
          active ? "text-white" : "text-[#4A3C32]"
        }`}
      >
        {label}
      </Text>
      {!!badge && badge > 0 && (
        <View className="min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF4D6D] px-1">
          <Text className="font-['JetBrainsMono_700Bold'] text-[10px] text-white">
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
        className="flex-1"
      >
        <View className="flex-1 bg-[#FFF7EE]">
          {/* Handle + header */}
          <View className="items-center pb-1 pt-3">
            <View className="h-1 w-10 rounded-sm bg-[rgba(26,20,16,0.14)]" />
          </View>
          <View className="flex-row items-center gap-3 px-[18px] py-3.5">
            <View
              className={`h-11 w-11 items-center justify-center rounded-[14px] ${SQUAD_BG_CLASS[selectedColor]}`}
            >
              <Icon name={colorDef.icon} size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-['BricolageGrotesque_700Bold'] text-[22px] tracking-[-0.4px] text-[#1A1410]">
                Create a <Text className="italic text-[#FF6A1F]">squad</Text>
              </Text>
              <Text className="mt-px text-xs text-[#8A7A6E]">
                Reusable group for fast runs & splits
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="h-8 w-8 items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
            >
              <Icon name="X" size={15} color={BR.ink} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerClassName="px-[18px] pb-10"
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text className="mb-2 font-['JetBrainsMono_600SemiBold'] text-[10px] uppercase tracking-[1.2px] text-[#8A7A6E]">
              Squad name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Lunch crew, Roomies…"
              placeholderTextColor="#8A7A6E"
              className="mb-5 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white px-4 py-3.5 font-['BricolageGrotesque_500Medium'] text-lg text-[#1A1410]"
            />

            {/* Color picker */}
            <Text className="mb-2.5 font-['JetBrainsMono_600SemiBold'] text-[10px] uppercase tracking-[1.2px] text-[#8A7A6E]">
              Pick a vibe
            </Text>
            <View className="mb-[22px] flex-row gap-2.5">
              {SQUAD_COLORS.map((c) => {
                const isSelected = selectedColor === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setSelectedColor(c.key)}
                    className={`aspect-square flex-1 items-center justify-center rounded-[14px] ${SQUAD_BG_CLASS[c.key]} ${
                      isSelected
                        ? "border-[3px] border-[#1A1410] shadow-[2px_2px_0_#1A1410]"
                        : "border-2 border-transparent"
                    }`}
                  >
                    <Icon name={c.icon} size={18} color="#fff" />
                  </Pressable>
                );
              })}
            </View>

            {/* Friend selector */}
            <Text className="mb-2.5 font-['JetBrainsMono_600SemiBold'] text-[10px] uppercase tracking-[1.2px] text-[#8A7A6E]">
              Add friends
            </Text>
            {friends.length === 0 ? (
              <Text className="mb-5 text-[13px] text-[#8A7A6E]">
                Add some friends first to include them in a squad.
              </Text>
            ) : (
              <View className="mb-6 flex-row flex-wrap gap-2">
                {friends.map((f) => {
                  const isSelected = selectedMembers.has(f.id);
                  const fullName = `${f.firstName} ${f.lastName}`;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => toggleMember(f.id)}
                      className={`flex-row items-center gap-[7px] rounded-full py-1.5 pl-1.5 pr-3 ${
                        isSelected
                          ? "border border-[#1A1410] bg-[#1A1410]"
                          : "border border-[rgba(26,20,16,0.08)] bg-white"
                      }`}
                    >
                      <Avatar
                        name={fullName}
                        avatarUrl={f.avatarUrl}
                        size={24}
                      />
                      <Text
                        className={`font-['BricolageGrotesque_600SemiBold'] text-[13px] ${
                          isSelected ? "text-white" : "text-[#1A1410]"
                        }`}
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
              className={`h-[54px] flex-row items-center justify-center gap-2.5 rounded-2xl bg-[#FF6A1F] shadow-[0_8px_16px_rgba(255,106,31,0.4)] ${saving ? "opacity-65" : ""}`}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="Sparkles" size={16} color="#fff" />
                  <Text className="font-['BricolageGrotesque_700Bold'] text-base text-white">
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
      <ScrollView contentContainerClassName="gap-2.5 px-[18px] pb-8">
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
      contentContainerClassName="px-[18px] pb-8"
      showsVerticalScrollIndicator={false}
    >
      {/* Pending request banner */}
      {pendingCount > 0 && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            onPress={() => {
              /* parent handles tab switch — pass via prop below */
            }}
            className="mb-3 flex-row items-center gap-2.5 rounded-2xl border border-[rgba(255,106,31,0.2)] bg-[#FFF1E2] p-3"
          >
            <View className="flex-row">
              {(requests ?? []).slice(0, 3).map((r, j) => (
                <View
                  key={r.id}
                  className={`rounded-full ${j > 0 ? "-ml-2.5" : ""}`}
                >
                  <Avatar
                    name={`${r.sender?.firstName} ${r.sender?.lastName}`}
                    avatarUrl={r.sender?.avatarUrl}
                    size={28}
                  />
                </View>
              ))}
            </View>
            <Text className="flex-1 font-['BricolageGrotesque_600SemiBold'] text-[13px] text-[#E8551A]">
              {pendingCount} new friend{" "}
              {pendingCount === 1 ? "request" : "requests"}
            </Text>
            <Icon name="ChevronRight" size={16} color="#FF6A1F" />
          </Pressable>
        </Animated.View>
      )}

      {/* Search bar */}
      {(friends?.length ?? 0) > 3 && (
        <View className="mb-3 h-[42px] flex-row items-center gap-2 rounded-[14px] border border-[rgba(26,20,16,0.08)] bg-white px-3">
          <Icon name="Search" size={15} color="#8A7A6E" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search friends…"
            placeholderTextColor="#8A7A6E"
            className="flex-1 font-['BricolageGrotesque_500Medium'] text-sm text-[#1A1410]"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Icon name="X" size={14} color="#8A7A6E" />
            </Pressable>
          )}
        </View>
      )}

      {friends.length === 0 ? (
        <View className="items-center px-6 pt-12">
          <View className="mb-3.5 h-16 w-16 items-center justify-center rounded-[20px] bg-[#FCEFE0]">
            <Icon name="Users" size={28} color="#8A7A6E" />
          </View>
          <Text className="font-['BricolageGrotesque_700Bold'] text-[17px] text-[#1A1410]">
            No friends yet
          </Text>
          <Text className="mt-1.5 text-center text-[13px] leading-5 text-[#8A7A6E]">
            Search for people to add them as friends and start ordering together
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="items-center pt-8">
          <Text className="text-[13px] text-[#8A7A6E]">
            No friends matching "{search}"
          </Text>
        </View>
      ) : (
        <View className="gap-2">
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
                  className="flex-row items-center gap-3 rounded-[18px] border border-[rgba(255,106,31,0.2)] bg-[#FFF1E2] p-3.5"
                >
                  <Avatar
                    name={fullName}
                    avatarUrl={friend.avatarUrl}
                    size={46}
                  />
                  <View className="flex-1">
                    <Text className="font-['BricolageGrotesque_700Bold'] text-[15px] text-[#1A1410]">
                      {fullName}
                    </Text>
                    <View className="mt-0.5 flex-row items-center gap-1">
                      <Icon name="UserCheck" size={11} color="#2EBE7B" />
                      <Text className="font-['BricolageGrotesque_600SemiBold'] text-xs text-[#2EBE7B]">
                        Friends
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleRemove(friend.id, fullName)}
                    disabled={removingId === friend.id}
                    className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-white"
                  >
                    {removingId === friend.id ? (
                      <ActivityIndicator size="small" color="#8A7A6E" />
                    ) : (
                      <Icon name="X" size={16} color={BR.ink} />
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
      <ScrollView contentContainerClassName="gap-2.5 px-[18px] pb-8">
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
      <View className="items-center px-6 pt-12">
        <View className="mb-3.5 h-16 w-16 items-center justify-center rounded-[20px] bg-[#FCEFE0]">
          <Icon name="Bell" size={28} color="#8A7A6E" />
        </View>
        <Text className="font-['BricolageGrotesque_700Bold'] text-[17px] text-[#1A1410]">
          No pending requests
        </Text>
        <Text className="mt-1.5 text-center text-[13px] leading-5 text-[#8A7A6E]">
          When someone sends you a friend request, it will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerClassName="px-[18px] pb-8"
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-2.5 font-['JetBrainsMono_600SemiBold'] text-[10px] uppercase tracking-[1.2px] text-[#8A7A6E]">
        {requests.length} pending
      </Text>
      <View className="gap-2.5">
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
              <View className="rounded-[18px] border border-[rgba(255,106,31,0.2)] bg-[#FFF1E2] p-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="relative">
                    <Avatar
                      name={fullName}
                      avatarUrl={req.sender.avatarUrl}
                      size={48}
                    />
                    <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-[#FFF1E2] bg-[#FF6A1F]">
                      <Icon name="UserPlus" size={10} color="#fff" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="font-['BricolageGrotesque_700Bold'] text-[15px] text-[#1A1410]">
                      {fullName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-[#8A7A6E]">
                      Wants to be your friend
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <AnimatedPressable
                      scale={0.9}
                      onPress={() => handleReject(req.id)}
                      disabled={isProcessing}
                      className="h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[rgba(26,20,16,0.14)] bg-white"
                    >
                      {isRejecting ? (
                        <ActivityIndicator size="small" color="#8A7A6E" />
                      ) : (
                        <Icon
                          name="X"
                          size={18}
                          color="#4A3C32"
                          strokeWidth={2.5}
                        />
                      )}
                    </AnimatedPressable>
                    <AnimatedPressable
                      scale={0.9}
                      onPress={() => handleAccept(req.id)}
                      disabled={isProcessing}
                      className="h-11 w-11 items-center justify-center rounded-full bg-[#2EBE7B]"
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
    <View className="flex-1 px-[18px]">
      {/* Search input */}
      <View className="mb-4 h-[46px] flex-row items-center gap-2 rounded-[14px] border border-[rgba(26,20,16,0.08)] bg-white px-3">
        <Icon name="Search" size={16} color="#8A7A6E" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email…"
          placeholderTextColor="#8A7A6E"
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 font-['BricolageGrotesque_500Medium'] text-sm text-[#1A1410]"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Icon name="X" size={14} color="#8A7A6E" />
          </Pressable>
        )}
      </View>

      {query.length < 2 && (
        <View className="items-center pt-10">
          <View className="mb-3.5 h-16 w-16 items-center justify-center rounded-[20px] bg-[#FCEFE0]">
            <Icon name="Search" size={28} color="#8A7A6E" />
          </View>
          <Text className="font-['BricolageGrotesque_700Bold'] text-[17px] text-[#1A1410]">
            Find Friends
          </Text>
          <Text className="mt-1.5 text-center text-[13px] text-[#8A7A6E]">
            Enter at least 2 characters to search
          </Text>
        </View>
      )}

      {isSearching && (
        <Skeleton>
          <View className="gap-2.5">
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
        <View className="items-center pt-10">
          <View className="mb-3.5 h-16 w-16 items-center justify-center rounded-[20px] bg-[#FCEFE0]">
            <Icon name="UserX" size={28} color="#8A7A6E" />
          </View>
          <Text className="font-['BricolageGrotesque_700Bold'] text-[17px] text-[#1A1410]">
            No users found
          </Text>
          <Text className="mt-1.5 text-[13px] text-[#8A7A6E]">
            Try a different name or email
          </Text>
        </View>
      )}

      {searchResults && searchResults.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-2 pb-8"
        >
          {searchResults.map((user, i) => {
            const fullName = `${user.firstName} ${user.lastName}`;
            return (
              <Animated.View
                key={user.id}
                entering={FadeInUp.duration(250).delay(i * 40)}
              >
                <View className="flex-row items-center gap-3 rounded-2xl border border-[rgba(26,20,16,0.08)] bg-white p-3">
                  <Avatar
                    name={fullName}
                    avatarUrl={user.avatarUrl}
                    size={46}
                  />
                  <View className="flex-1">
                    <Text className="font-['BricolageGrotesque_700Bold'] text-[15px] text-[#1A1410]">
                      {fullName}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs text-[#8A7A6E]"
                      numberOfLines={1}
                    >
                      {user.email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAdd(user.id, fullName)}
                    disabled={sendingTo === user.id}
                    activeOpacity={0.8}
                    className="flex-row items-center gap-[5px] rounded-[10px] bg-[#1A1410] px-3 py-2"
                  >
                    {sendingTo === user.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="UserPlus" size={14} color="#fff" />
                        <Text className="font-['BricolageGrotesque_600SemiBold'] text-[13px] text-white">
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
  const _insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: Tab }>();
  const [activeTab, setActiveTab] = useState<Tab>(tab ?? "friends");
  const [showCreateSquad, setShowCreateSquad] = useState(false);

  const pendingCount = useQuery(api.friends.pendingRequestCount) ?? 0;
  const friends = useQuery(api.friends.list) ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
      {/* Header */}
      <View className="relative flex-row items-center justify-between px-[18px] py-2.5">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <View className="pointer-events-none absolute inset-x-0 top-2.5 bottom-2.5 items-center justify-center">
          <BrText
            weight="bold"
            className="text-[17px] leading-6"
            style={BR_FONT_STYLE.display}
          >
            Friends
          </BrText>
        </View>
        <View className="w-9" />
      </View>

      {/* Tab row */}
      <View className="px-[18px] pb-3.5">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
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
      <View className="flex-1">
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
