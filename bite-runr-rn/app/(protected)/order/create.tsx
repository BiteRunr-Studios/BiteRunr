import { memo, useCallback, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Alert,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useFriends, useCreateOrder } from "@/lib/hooks/use-order-api";
import Icon from "@/components/common/icon";
import { AnimatedPressable } from "@/components/common/animated-pressable";
import { BrText, BrAvatar } from "@/components/br";
import {
  BR,
  BR_FONT,
  BR_FONT_STYLE,
  BR_RADIUS,
  BR_SHADOW,
} from "@/lib/br-theme";

// ── Types ─────────────────────────────────────────────────────────

interface FieldErrors {
  name?: string;
  order_locations?: string;
}

interface Friend {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
}

// ── Utilities ─────────────────────────────────────────────────────

function parseReorderLocationNames(raw?: string) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
  } catch {}
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

// ── Constants ────────────────────────────────────────────────────

const INPUT_ACCESSORY_ID = "create-order-inputs";

const inputTextStyle = {
  fontFamily: BR_FONT.displayMedium,
  color: BR.ink,
  paddingVertical: 0,
  includeFontPadding: false,
  textAlignVertical: "center" as const,
};

const styles = StyleSheet.create({
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderColor: BR.line,
    backgroundColor: BR.card,
    ...BR_SHADOW.card,
  },
  inputBoxError: {
    borderColor: BR.coral,
  },
  nameInput: {
    ...inputTextStyle,
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
  },
  spotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: BR_RADIUS.lg,
    borderWidth: 1,
    borderColor: BR.line,
    backgroundColor: BR.card,
    ...BR_SHADOW.card,
  },
  spotRowError: {
    borderColor: BR.coral,
  },
  spotInput: {
    ...inputTextStyle,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  footerButton: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.orange,
  },
  footerButtonReady: {
    ...BR_SHADOW.primary,
  },
  footerButtonDisabled: {
    opacity: 0.55,
  },
  footerButtonPending: {
    opacity: 0.6,
  },
  accessoryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: BR.line,
    backgroundColor: BR.paper2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  accessoryDone: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

const FRIENDS_VISIBLE_CAP = 6;
const FRIEND_HAPTIC_MIN_INTERVAL_MS = 80;

let lastFriendHapticAt = 0;

function fireFriendHaptic() {
  const now = Date.now();
  if (now - lastFriendHapticAt < FRIEND_HAPTIC_MIN_INTERVAL_MS) return;
  lastFriendHapticAt = now;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const FriendSelectRow = memo(function FriendSelectRow({
  friend,
  fullName,
  isSelected,
  showBorder,
  onToggle,
}: {
  friend: Friend;
  fullName: string;
  isSelected: boolean;
  showBorder: boolean;
  onToggle: (id: string) => void;
}) {
  const handlePress = useCallback(() => {
    onToggle(friend.id);
  }, [friend.id, onToggle]);

  return (
    <AnimatedPressable
      scale={0.98}
      onPress={handlePress}
      className={`flex-row items-center gap-3 px-3 py-2.5 ${showBorder ? "border-b border-[rgba(26,20,16,0.08)]" : ""} ${isSelected ? "bg-[#FFF1E2]" : ""}`}
    >
      <BrAvatar
        name={fullName}
        avatarUrl={friend.avatar_url}
        size={38}
        ring={isSelected ? BR.orange : "transparent"}
      />
      <Text
        className="flex-1 text-sm text-[#1A1410]"
        style={BR_FONT_STYLE.displaySemibold}
        numberOfLines={1}
      >
        {fullName}
      </Text>
      <View
        className={`h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#FF6A1F] bg-[#FF6A1F]" : "border-[rgba(26,20,16,0.14)]"}`}
      >
        {isSelected && (
          <Icon name="Check" size={12} color="#fff" strokeWidth={3} />
        )}
      </View>
    </AnimatedPressable>
  );
});

// ── Main ─────────────────────────────────────────────────────────

export default function CreateOrder() {
  const insets = useSafeAreaInsets();
  const { reorderName, reorderLocationNames, reorderFriendIds } =
    useLocalSearchParams<{
      reorderName?: string;
      reorderLocationNames?: string;
      reorderFriendIds?: string;
    }>();
  const isReorder = !!reorderName;

  // ── Form state
  const [name, setName] = useState(reorderName ?? "");
  const [spots, setSpots] = useState<string[]>(() => {
    const pre = parseReorderLocationNames(reorderLocationNames);
    return pre.length > 0 ? pre : [""];
  });
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(() =>
    reorderFriendIds ? reorderFriendIds.split(",").filter(Boolean) : [],
  );
  const [comments, setComments] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ── Data
  const { data: rawFriends = [], isLoading: isLoadingFriends } = useFriends();
  const friends = rawFriends as Friend[];
  const squads = useQuery(api.squads.list) ?? [];
  const createOrderMutation = useCreateOrder();

  // ── Spot helpers
  const setSpotAt = (i: number, v: string) =>
    setSpots((p) => p.map((s, idx) => (idx === i ? v : s)));
  const addSpot = () => setSpots((p) => [...p, ""]);
  const removeSpot = (i: number) =>
    setSpots((p) => (p.length === 1 ? [""] : p.filter((_, idx) => idx !== i)));

  // ── Friend helpers
  const selectedFriendIdSet = useMemo(
    () => new Set(selectedFriendIds),
    [selectedFriendIds],
  );

  const toggleFriend = useCallback((id: string) => {
    fireFriendHaptic();
    setSelectedFriendIds((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }, []);

  const toggleSquad = useCallback((memberIds: string[]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFriendIds((prev) => {
      const prevSet = new Set(prev);
      const allSelected =
        memberIds.length > 0 && memberIds.every((id) => prevSet.has(id));
      if (allSelected) {
        return prev.filter((id) => !memberIds.includes(id));
      }
      return [...new Set([...prev, ...memberIds])];
    });
  }, []);

  const filteredFriends = useMemo(
    () =>
      friendQuery
        ? friends.filter((f) =>
            `${f.first_name} ${f.last_name}`
              .toLowerCase()
              .includes(friendQuery.toLowerCase()),
          )
        : friends,
    [friends, friendQuery],
  );
  const visibleFriends =
    friendQuery || showAllFriends
      ? filteredFriends
      : filteredFriends.slice(0, FRIENDS_VISIBLE_CAP);

  // ── Validation
  const validSpots = spots.filter((s) => s.trim());
  const isValid = name.trim().length > 0 && validSpots.length > 0;

  const clearError = (field: keyof FieldErrors) =>
    setFieldErrors((p) => ({ ...p, [field]: undefined }));

  // ── Submit
  const handleCreate = async () => {
    const trimmedName = name.trim();
    const locationNames = spots.map((s) => s.trim()).filter(Boolean);
    const errors: FieldErrors = {};
    if (!trimmedName) errors.name = "Name is required";
    if (locationNames.length === 0)
      errors.order_locations = "Add at least one stop";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const orderId = await createOrderMutation.mutateAsync({
        name: trimmedName,
        comments: comments.trim() || null,
        locationNames,
        friendIds: selectedFriendIds,
      });
      router.replace(`/(protected)/order/${orderId}`);
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to create order");
    }
  };

  return (
    <>
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-[18px] pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
          >
            <Icon name="ChevronLeft" size={20} color={BR.ink} />
          </Pressable>
          <Text
            className="text-[17px] text-[#1A1410]"
            style={BR_FONT_STYLE.display}
          >
            {isReorder ? "Order again" : "New run"}
          </Text>
          <View className="rotate-[3deg] flex-row items-center gap-[5px] rounded-full bg-[#FFF1C4] px-2.5 py-[5px]">
            <Icon name="Sparkles" size={11} color="#7A4A20" />
            <Text
              className="text-[11px] text-[#7A4A20]"
              style={BR_FONT_STYLE.monoBold}
            >
              Quick
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1 bg-[#FFF7EE]"
            contentContainerClassName="px-[18px] pb-6 pt-2"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero headline */}
            <Animated.View entering={FadeInUp.duration(300)} className="px-0.5">
              <Text
                className="mt-1 text-[34px] leading-[38px] tracking-[-0.5px] text-[#1A1410]"
                style={BR_FONT_STYLE.displayExtraBold}
              >
                {"Who's "}
                <Text
                  className="italic text-[#FF6A1F]"
                  style={BR_FONT_STYLE.displayExtraBold}
                >
                  hungry?
                </Text>
              </Text>
            </Animated.View>

            {/* ── Run name ──────────────────────────────────────────────── */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(70)}
              className="mt-[22px]"
            >
              <BrText variant="eyebrow">Call it something</BrText>
              <View
                style={[
                  styles.inputBox,
                  fieldErrors.name ? styles.inputBoxError : null,
                ]}
              >
                <TextInput
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (fieldErrors.name) clearError("name");
                  }}
                  placeholder="Friday lunch run"
                  placeholderTextColor={BR.ink3}
                  style={styles.nameInput}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  inputAccessoryViewID={INPUT_ACCESSORY_ID}
                />
                {!name && (
                  <Text
                    className="pr-4 text-[11px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    required
                  </Text>
                )}
              </View>
              {fieldErrors.name && (
                <Text
                  className="ml-0.5 mt-[5px] text-[11px] text-[#FF4D6D]"
                  style={BR_FONT_STYLE.mono}
                >
                  {fieldErrors.name}
                </Text>
              )}
            </Animated.View>

            {/* ── Stops ─────────────────────────────────────────────────── */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(100)}
              className="mt-[22px]"
            >
              <View className="flex-row items-baseline gap-1.5">
                <BrText variant="eyebrow">Where to?</BrText>
                {spots.length > 1 && (
                  <Text
                    className="text-[11px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    · {spots.length} stops
                  </Text>
                )}
              </View>

              <View className="mt-2.5 gap-2">
                {spots.map((s, i) => (
                  <View
                    key={`location-${i}`}
                    style={[
                      styles.spotRow,
                      fieldErrors.order_locations && i === 0 && !s.trim()
                        ? styles.spotRowError
                        : null,
                    ]}
                  >
                    <View className="h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF1E2]">
                      {spots.length > 1 ? (
                        <Text
                          className="text-xs text-[#E8551A]"
                          style={BR_FONT_STYLE.monoBold}
                        >
                          {i + 1}
                        </Text>
                      ) : (
                        <Icon name="MapPin" size={15} color={BR.orangeDeep} />
                      )}
                    </View>
                    <TextInput
                      value={s}
                      onChangeText={(v) => {
                        setSpotAt(i, v);
                        if (fieldErrors.order_locations)
                          clearError("order_locations");
                      }}
                      placeholder={
                        i === 0 ? `Costco` : `Stop ${i + 1} — another place`
                      }
                      placeholderTextColor={BR.ink3}
                      style={styles.spotInput}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                      inputAccessoryViewID={INPUT_ACCESSORY_ID}
                    />
                    {(s.trim().length > 0 || spots.length > 1) && (
                      <Pressable
                        onPress={() => removeSpot(i)}
                        hitSlop={8}
                        className="h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#FCEFE0]"
                      >
                        <Icon name="X" size={12} color={BR.ink2} />
                      </Pressable>
                    )}
                    {!s.trim() && spots.length === 1 && (
                      <Text
                        className="text-[11px] text-[#8A7A6E]"
                        style={BR_FONT_STYLE.mono}
                      >
                        required
                      </Text>
                    )}
                  </View>
                ))}

                {fieldErrors.order_locations && (
                  <Text
                    className="ml-0.5 mt-[5px] text-[11px] text-[#FF4D6D]"
                    style={BR_FONT_STYLE.mono}
                  >
                    {fieldErrors.order_locations}
                  </Text>
                )}

                <Pressable
                  onPress={addSpot}
                  className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(26,20,16,0.14)] py-3"
                >
                  <Icon
                    name="Plus"
                    size={13}
                    color={BR.ink2}
                    strokeWidth={2.5}
                  />
                  <Text
                    className="text-[13px] text-[#4A3C32]"
                    style={BR_FONT_STYLE.displaySemibold}
                  >
                    Add another stop
                  </Text>
                </Pressable>
              </View>

              <View className="mt-2.5 flex-row items-start gap-1.5">
                <Icon name="Info" size={11} color={BR.ink3} />
                <Text
                  className="flex-1 text-[11px] leading-[17px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  Anywhere works — a restaurant, an address, or just "the
                  usual."
                </Text>
              </View>
            </Animated.View>

            {/* ── Divider ────────────────────────────────────────────────── */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(130)}
              className="my-7 flex-row items-center gap-3"
            >
              <View className="h-px flex-1 bg-[rgba(26,20,16,0.14)]" />
            </Animated.View>

            {/* ── Friends ────────────────────────────────────────────────── */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(150)}
              className="mt-2"
            >
              <View className="flex-row items-baseline justify-between">
                <View className="flex-row items-baseline gap-1.5">
                  <BrText variant="eyebrow">Who's coming?</BrText>
                  <Text
                    className="text-[11px] text-[#8A7A6E]"
                    style={BR_FONT_STYLE.mono}
                  >
                    {selectedFriendIds.length === 0
                      ? "· tap to invite"
                      : `· ${selectedFriendIds.length} invited`}
                  </Text>
                </View>
                {selectedFriendIds.length > 0 && (
                  <Pressable
                    onPress={() => setSelectedFriendIds([])}
                    hitSlop={8}
                  >
                    <Text
                      className="text-[11px] text-[#8A7A6E]"
                      style={BR_FONT_STYLE.monoSemibold}
                    >
                      Clear
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Squad shortcuts */}
              {squads.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="mt-3 gap-2 py-0.5"
                >
                  {squads.map((squad) => {
                    const memberIds = squad.memberIds as string[];
                    const allSelected =
                      memberIds.length > 0 &&
                      memberIds.every((id) => selectedFriendIdSet.has(id));
                    return (
                      <AnimatedPressable
                        key={squad.id}
                        scale={0.93}
                        onPress={() => toggleSquad(memberIds)}
                        className={`flex-row items-center gap-[7px] rounded-full py-1.5 pl-1.5 pr-3 ${allSelected ? "border border-[#FF6A1F] bg-[#FF6A1F]" : "border border-[rgba(26,20,16,0.08)] bg-white"}`}
                      >
                        {/* Stacked avatars */}
                        <View className="flex-row">
                          {squad.members.slice(0, 3).map((m, i) => (
                            <View key={m.id} className={i > 0 ? "-ml-2" : ""}>
                              <BrAvatar
                                name={`${m.firstName} ${m.lastName}`}
                                avatarUrl={m.avatarUrl}
                                size={22}
                                ring={allSelected ? BR.orange : BR.card}
                              />
                            </View>
                          ))}
                        </View>
                        <Text
                          className={`text-[13px] ${allSelected ? "text-white" : "text-[#1A1410]"}`}
                          style={BR_FONT_STYLE.displaySemibold}
                        >
                          {squad.name}
                        </Text>
                        <Text
                          className={`text-[11px] ${allSelected ? "text-white/70" : "text-[#8A7A6E]"}`}
                          style={BR_FONT_STYLE.mono}
                        >
                          · {squad.memberIds.length}
                        </Text>
                        {allSelected && (
                          <Animated.View
                            entering={ZoomIn.duration(150).springify()}
                          >
                            <Icon
                              name="Check"
                              size={13}
                              color="#fff"
                              strokeWidth={3}
                            />
                          </Animated.View>
                        )}
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Search */}
              <View className="mt-3 flex-row items-center gap-2.5 rounded-[22px] border border-[rgba(26,20,16,0.08)] bg-white p-3 shadow-[0_6px_18px_rgba(26,20,16,0.1)]">
                <Icon name="Search" size={15} color={BR.ink3} />
                <TextInput
                  value={friendQuery}
                  onChangeText={setFriendQuery}
                  placeholder={`Search ${friends.length} friends`}
                  placeholderTextColor={BR.ink3}
                  className="flex-1 py-0 text-sm text-[#1A1410]"
                  style={BR_FONT_STYLE.displayMedium}
                  returnKeyType="search"
                  inputAccessoryViewID={INPUT_ACCESSORY_ID}
                />
                {friendQuery.length > 0 && (
                  <Pressable
                    onPress={() => setFriendQuery("")}
                    hitSlop={8}
                    className="h-[22px] w-[22px] items-center justify-center rounded-full bg-[#FCEFE0]"
                  >
                    <Icon name="X" size={11} color={BR.ink2} />
                  </Pressable>
                )}
              </View>

              {/* Friend list */}
              <View className="mt-2.5 overflow-hidden rounded-[22px] border border-[rgba(26,20,16,0.08)] bg-white shadow-[0_6px_18px_rgba(26,20,16,0.1)]">
                {isLoadingFriends ? (
                  <View className="items-center p-6">
                    <ActivityIndicator size="small" color={BR.orange} />
                  </View>
                ) : visibleFriends.length === 0 ? (
                  <View className="items-center p-6">
                    <Text
                      className="text-[13px] text-[#8A7A6E]"
                      style={BR_FONT_STYLE.mono}
                    >
                      {friendQuery
                        ? `No matches for "${friendQuery}"`
                        : "No friends yet"}
                    </Text>
                  </View>
                ) : (
                  visibleFriends.map((f, i) => {
                    const fullName = `${f.first_name} ${f.last_name}`;
                    return (
                      <FriendSelectRow
                        key={f.id}
                        friend={f}
                        fullName={fullName}
                        isSelected={selectedFriendIdSet.has(f.id)}
                        showBorder={i < visibleFriends.length - 1}
                        onToggle={toggleFriend}
                      />
                    );
                  })
                )}
              </View>

              {/* Show more */}
              {!friendQuery && filteredFriends.length > FRIENDS_VISIBLE_CAP && (
                <Pressable
                  onPress={() => setShowAllFriends((v) => !v)}
                  className="mt-1.5 flex-row items-center justify-center gap-1.5 py-2.5"
                  hitSlop={8}
                >
                  <Text
                    className="text-xs text-[#E8551A]"
                    style={BR_FONT_STYLE.displaySemibold}
                  >
                    {showAllFriends
                      ? "Show less"
                      : `Show all ${friends.length} friends`}
                  </Text>
                  <Icon
                    name={showAllFriends ? "ChevronUp" : "ChevronDown"}
                    size={12}
                    color={BR.orangeDeep}
                  />
                </Pressable>
              )}
            </Animated.View>

            {/* ── Notes ─────────────────────────────────────────────────── */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(180)}
              className="mt-[18px]"
            >
              <View className="flex-row items-baseline gap-1.5">
                <BrText variant="eyebrow">Note for the squad</BrText>
                <Text
                  className="text-[11px] text-[#8A7A6E]"
                  style={BR_FONT_STYLE.mono}
                >
                  · optional
                </Text>
              </View>
              <View className="mt-2.5 rounded-[22px] border border-[rgba(26,20,16,0.08)] bg-white p-3.5 shadow-[0_6px_18px_rgba(26,20,16,0.1)]">
                <TextInput
                  value={comments}
                  onChangeText={setComments}
                  placeholder="Closing in 30 min · order ASAP 🏃‍♀️"
                  placeholderTextColor={BR.ink3}
                  className="min-h-[72px] p-0 text-sm leading-5 text-[#1A1410]"
                  style={BR_FONT_STYLE.displayMedium}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  inputAccessoryViewID={INPUT_ACCESSORY_ID}
                />
              </View>
            </Animated.View>

            {/* Spacer for footer */}
            <View className="h-[100px]" />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky footer */}
        <View
          className="gap-2.5 px-[18px] pt-3.5"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          {isValid && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="flex-row items-center gap-2 self-stretch rounded-full border border-[rgba(46,190,123,0.25)] bg-[rgba(46,190,123,0.12)] px-3.5 py-[9px]"
            >
              <Icon name="CircleCheck" size={14} color={BR.mintInk} />
              <Text
                className="text-xs text-[#1B6B43]"
                style={BR_FONT_STYLE.monoSemibold}
              >
                Ready to roll · {selectedFriendIds.length + 1}{" "}
                {selectedFriendIds.length === 0 ? "person" : "people"}
              </Text>
            </Animated.View>
          )}
          <AnimatedPressable
            scale={isValid ? 0.97 : 1}
            onPress={handleCreate}
            disabled={createOrderMutation.isPending}
            style={[
              styles.footerButton,
              isValid ? styles.footerButtonReady : styles.footerButtonDisabled,
              createOrderMutation.isPending ? styles.footerButtonPending : null,
            ]}
          >
            {createOrderMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="Zap" size={16} color="#fff" />
                <Text
                  className="text-base text-white"
                  style={BR_FONT_STYLE.display}
                >
                  {isValid ? "Send the run" : "Pick a spot to continue"}
                </Text>
                {isValid && <Icon name="ArrowRight" size={16} color="#fff" />}
              </>
            )}
          </AnimatedPressable>
        </View>
      </SafeAreaView>

      {/* Keyboard dismiss toolbar — iOS only */}
      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={styles.accessoryBar}>
            <Pressable
              onPress={() => Keyboard.dismiss()}
              hitSlop={12}
              style={styles.accessoryDone}
            >
              <Text
                className="text-base text-[#FF6A1F]"
                style={BR_FONT_STYLE.displaySemibold}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}
