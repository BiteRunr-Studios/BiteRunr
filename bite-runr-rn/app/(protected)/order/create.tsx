import { useMemo, useState } from "react";
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
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useFriends, useCreateOrder } from "@/lib/hooks/use-order-api";
import Icon from "@/components/common/icon";
import { AnimatedPressable } from "@/components/common/animated-pressable";
import { BrText, BrAvatar } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";

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
        if (Array.isArray(parsed)) return parsed.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
    } catch {}
    return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

// ── Constants ────────────────────────────────────────────────────

const INPUT_ACCESSORY_ID = "create-order-inputs";

const QUICK_FILLS = ["☕ Morning coffee", "🍕 Pizza Friday", "🌮 Taco Tuesday"];


const FRIENDS_VISIBLE_CAP = 6;

// ── Main ─────────────────────────────────────────────────────────

export default function CreateOrder() {
    const insets = useSafeAreaInsets();
    const { reorderName, reorderLocationNames, reorderFriendIds } = useLocalSearchParams<{
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
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
        () => (reorderFriendIds ? reorderFriendIds.split(",").filter(Boolean) : []),
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
    const toggleFriend = (id: string) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFriendIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    };

    const toggleSquad = (memberIds: string[]) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const allSelected = memberIds.every((id) => selectedFriendIds.includes(id));
        if (allSelected) {
            setSelectedFriendIds((p) => p.filter((id) => !memberIds.includes(id)));
        } else {
            setSelectedFriendIds((p) => [...new Set([...p, ...memberIds])]);
        }
    };

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
        if (locationNames.length === 0) errors.order_locations = "Add at least one stop";
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
            <SafeAreaView edges={["top"]} style={{ backgroundColor: BR.paper }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Icon name="ChevronLeft" size={20} color={BR.ink} />
                </Pressable>
                <Text style={styles.headerTitle}>{isReorder ? "Order again" : "New run"}</Text>
                <View style={styles.quickSticker}>
                    <Icon name="Sparkles" size={11} color="#7A4A20" />
                    <Text style={styles.quickStickerText}>Quick</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={{ flex: 1, backgroundColor: BR.paper }}
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero headline */}
                    <Animated.View entering={FadeInUp.duration(300)} style={{ paddingHorizontal: 2 }}>
                        <Text style={styles.headline}>
                            {"Who's "}
                            <Text style={styles.headlineAccent}>hungry?</Text>
                        </Text>
                    </Animated.View>

                    {/* ── Run name ──────────────────────────────────────────────── */}
                    <Animated.View entering={FadeInUp.duration(300).delay(70)} style={{ marginTop: 22 }}>
                        <BrText variant="eyebrow">Call it something</BrText>
                        <View
                            style={[
                                styles.nameCard,
                                fieldErrors.name && { borderColor: BR.coral },
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
                                <Text style={styles.requiredHint}>required</Text>
                            )}
                        </View>
                        {fieldErrors.name && (
                            <Text style={styles.fieldError}>{fieldErrors.name}</Text>
                        )}
                        {/* Quick-fill chips */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {QUICK_FILLS.map((s) => (
                                <AnimatedPressable
                                    key={s}
                                    scale={0.93}
                                    onPress={() => {
                                        setName(s.split(" ").slice(1).join(" "));
                                        if (fieldErrors.name) clearError("name");
                                    }}
                                    style={styles.quickFillChip}
                                >
                                    <Text style={styles.quickFillText}>{s}</Text>
                                </AnimatedPressable>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ── Stops ─────────────────────────────────────────────────── */}
                    <Animated.View entering={FadeInUp.duration(300).delay(100)} style={{ marginTop: 22 }}>
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                            <BrText variant="eyebrow">Where to?</BrText>
                            {spots.length > 1 && (
                                <Text style={styles.spotsCountHint}>· {spots.length} stops</Text>
                            )}
                        </View>

                        <View style={{ gap: 8, marginTop: 10 }}>
                            {spots.map((s, i) => (
                                <View key={i} style={[styles.spotCard, fieldErrors.order_locations && i === 0 && !s.trim() && { borderColor: BR.coral }]}>
                                    <View style={styles.spotBadge}>
                                        {spots.length > 1 ? (
                                            <Text style={styles.spotBadgeText}>{i + 1}</Text>
                                        ) : (
                                            <Icon name="MapPin" size={15} color={BR.orangeDeep} />
                                        )}
                                    </View>
                                    <TextInput
                                        value={s}
                                        onChangeText={(v) => {
                                            setSpotAt(i, v);
                                            if (fieldErrors.order_locations) clearError("order_locations");
                                        }}
                                        placeholder={
                                            i === 0
                                                ? `"Sweetgreen on 5th"`
                                                : `Stop ${i + 1} — another place`
                                        }
                                        placeholderTextColor={BR.ink3}
                                        style={styles.spotInput}
                                        returnKeyType="done"
                                        onSubmitEditing={() => Keyboard.dismiss()}
                                        inputAccessoryViewID={INPUT_ACCESSORY_ID}
                                    />
                                    {(s.trim().length > 0 || spots.length > 1) && (
                                        <Pressable onPress={() => removeSpot(i)} hitSlop={8} style={styles.spotRemoveBtn}>
                                            <Icon name="X" size={12} color={BR.ink2} />
                                        </Pressable>
                                    )}
                                    {!s.trim() && spots.length === 1 && (
                                        <Text style={styles.requiredHint}>required</Text>
                                    )}
                                </View>
                            ))}

                            {fieldErrors.order_locations && (
                                <Text style={styles.fieldError}>{fieldErrors.order_locations}</Text>
                            )}

                            <Pressable onPress={addSpot} style={styles.addStopBtn}>
                                <Icon name="Plus" size={13} color={BR.ink2} strokeWidth={2.5} />
                                <Text style={styles.addStopText}>Add another stop</Text>
                            </Pressable>
                        </View>

                        <View style={styles.spotHintRow}>
                            <Icon name="Info" size={11} color={BR.ink3} />
                            <Text style={styles.spotHintText}>
                                Anywhere works — a restaurant, an address, or just "the usual."
                            </Text>
                        </View>
                    </Animated.View>

                    {/* ── Divider ────────────────────────────────────────────────── */}
                    <Animated.View entering={FadeInUp.duration(300).delay(130)} style={styles.sectionDivider}>
                        <View style={styles.sectionDividerLine} />
                        <Text style={styles.sectionDividerEmoji}>🤝</Text>
                        <View style={styles.sectionDividerLine} />
                    </Animated.View>

                    {/* ── Friends ────────────────────────────────────────────────── */}
                    <Animated.View entering={FadeInUp.duration(300).delay(150)} style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                                <BrText variant="eyebrow">Who's coming?</BrText>
                                <Text style={styles.spotsCountHint}>
                                    {selectedFriendIds.length === 0
                                        ? "· tap to invite"
                                        : `· ${selectedFriendIds.length} invited`}
                                </Text>
                            </View>
                            {selectedFriendIds.length > 0 && (
                                <Pressable onPress={() => setSelectedFriendIds([])} hitSlop={8}>
                                    <Text style={styles.clearText}>Clear</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Squad shortcuts */}
                        {squads.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingVertical: 2, marginTop: 12 }}
                            >
                                {squads.map((squad) => {
                                    const memberIds = squad.memberIds as string[];
                                    const allSelected = memberIds.length > 0 && memberIds.every((id) => selectedFriendIds.includes(id));
                                    return (
                                        <AnimatedPressable
                                            key={squad.id}
                                            scale={0.93}
                                            onPress={() => toggleSquad(memberIds)}
                                            style={[styles.squadPill, allSelected && styles.squadPillActive]}
                                        >
                                            {/* Stacked avatars */}
                                            <View style={{ flexDirection: "row" }}>
                                                {squad.members.slice(0, 3).map((m, i) => (
                                                    <View key={m.id} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                                                        <BrAvatar
                                                            name={`${m.firstName} ${m.lastName}`}
                                                            avatarUrl={m.avatarUrl}
                                                            size={22}
                                                            ring={allSelected ? BR.orange : BR.card}
                                                        />
                                                    </View>
                                                ))}
                                            </View>
                                            <Text style={[styles.squadPillName, allSelected && { color: "#fff" }]}>
                                                {squad.name}
                                            </Text>
                                            <Text style={[styles.squadPillCount, allSelected && { color: "rgba(255,255,255,0.7)" }]}>
                                                · {squad.memberIds.length}
                                            </Text>
                                            {allSelected && (
                                                <Animated.View entering={ZoomIn.duration(150).springify()}>
                                                    <Icon name="Check" size={13} color="#fff" strokeWidth={3} />
                                                </Animated.View>
                                            )}
                                        </AnimatedPressable>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Search */}
                        <View style={[styles.searchBar, { marginTop: 12 }]}>
                            <Icon name="Search" size={15} color={BR.ink3} />
                            <TextInput
                                value={friendQuery}
                                onChangeText={setFriendQuery}
                                placeholder={`Search ${friends.length} friends`}
                                placeholderTextColor={BR.ink3}
                                style={styles.searchInput}
                                returnKeyType="search"
                                inputAccessoryViewID={INPUT_ACCESSORY_ID}
                            />
                            {friendQuery.length > 0 && (
                                <Pressable onPress={() => setFriendQuery("")} hitSlop={8} style={styles.searchClearBtn}>
                                    <Icon name="X" size={11} color={BR.ink2} />
                                </Pressable>
                            )}
                        </View>

                        {/* Friend list */}
                        <View style={[styles.friendList, { marginTop: 10 }]}>
                            {isLoadingFriends ? (
                                <View style={{ padding: 24, alignItems: "center" }}>
                                    <ActivityIndicator size="small" color={BR.orange} />
                                </View>
                            ) : visibleFriends.length === 0 ? (
                                <View style={{ padding: 24, alignItems: "center" }}>
                                    <Text style={{ fontFamily: BR_FONT.mono, fontSize: 13, color: BR.ink3 }}>
                                        {friendQuery ? `No matches for "${friendQuery}"` : "No friends yet"}
                                    </Text>
                                </View>
                            ) : (
                                visibleFriends.map((f, i) => {
                                    const fullName = `${f.first_name} ${f.last_name}`;
                                    const selected = selectedFriendIds.includes(f.id);
                                    return (
                                        <AnimatedPressable
                                            key={f.id}
                                            scale={0.98}
                                            onPress={() => toggleFriend(f.id)}
                                            style={[
                                                styles.friendRow,
                                                i < visibleFriends.length - 1 && styles.friendRowBorder,
                                                selected && { backgroundColor: BR.orangeTint },
                                            ]}
                                        >
                                            <BrAvatar
                                                name={fullName}
                                                avatarUrl={f.avatar_url}
                                                size={38}
                                                ring={selected ? BR.orange : "transparent"}
                                            />
                                            <Text style={styles.friendName} numberOfLines={1}>
                                                {fullName}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.checkCircle,
                                                    selected && {
                                                        backgroundColor: BR.orange,
                                                        borderColor: BR.orange,
                                                    },
                                                ]}
                                            >
                                                {selected && (
                                                    <Animated.View entering={ZoomIn.duration(160).springify()}>
                                                        <Icon name="Check" size={12} color="#fff" strokeWidth={3} />
                                                    </Animated.View>
                                                )}
                                            </View>
                                        </AnimatedPressable>
                                    );
                                })
                            )}
                        </View>

                        {/* Show more */}
                        {!friendQuery && filteredFriends.length > FRIENDS_VISIBLE_CAP && (
                            <Pressable
                                onPress={() => setShowAllFriends((v) => !v)}
                                style={styles.showMoreBtn}
                                hitSlop={8}
                            >
                                <Text style={styles.showMoreText}>
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
                    <Animated.View entering={FadeInUp.duration(300).delay(180)} style={{ marginTop: 18 }}>
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                            <BrText variant="eyebrow">Note for the squad</BrText>
                            <Text style={styles.spotsCountHint}>· optional</Text>
                        </View>
                        <View style={[styles.notesCard, { marginTop: 10 }]}>
                            <TextInput
                                value={comments}
                                onChangeText={setComments}
                                placeholder="Closing in 30 min · order ASAP 🏃‍♀️"
                                placeholderTextColor={BR.ink3}
                                style={styles.notesInput}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                inputAccessoryViewID={INPUT_ACCESSORY_ID}
                            />
                        </View>
                    </Animated.View>

                    {/* Spacer for footer */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Keyboard dismiss toolbar — iOS only */}
            {Platform.OS === "ios" && (
                <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
                    <View style={styles.keyboardToolbar}>
                        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={12} style={styles.keyboardDoneBtn}>
                            <Text style={styles.keyboardDoneText}>Done</Text>
                        </Pressable>
                    </View>
                </InputAccessoryView>
            )}

            {/* Sticky footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {isValid && (
                    <Animated.View entering={FadeInDown.duration(200)} style={styles.readyBadge}>
                        <Icon name="CircleCheck" size={14} color={BR.mintInk} />
                        <Text style={styles.readyBadgeText}>
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
                        styles.createBtn,
                        !isValid && styles.createBtnDisabled,
                        createOrderMutation.isPending && { opacity: 0.6 },
                    ]}
                >
                    {createOrderMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Icon name="Zap" size={16} color="#fff" />
                            <Text style={styles.createBtnText}>
                                {isValid ? "Send the run" : "Pick a spot to continue"}
                            </Text>
                            {isValid && <Icon name="ArrowRight" size={16} color="#fff" />}
                        </>
                    )}
                </AnimatedPressable>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: BR.paper,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        borderWidth: 1,
        borderColor: BR.line,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontFamily: BR_FONT.display,
        fontSize: 17,
        fontWeight: "700",
        color: BR.ink,
    },
    quickSticker: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: BR.yolkSoft,
        transform: [{ rotate: "3deg" }],
    },
    quickStickerText: {
        fontFamily: BR_FONT.monoBold,
        fontSize: 11,
        color: "#7A4A20",
    },
    scroll: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 24,
    },
    // headline
    headline: {
        fontFamily: BR_FONT.displayExtraBold,
        fontSize: 34,
        lineHeight: 38,
        color: BR.ink,
        letterSpacing: -0.5,
        marginTop: 4,
    },
    headlineAccent: {
        color: BR.orange,
        fontStyle: "italic",
        fontFamily: BR_FONT.displayExtraBold,
    },
    // keyboard toolbar
    keyboardToolbar: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: BR.paper2,
        borderTopWidth: 1,
        borderTopColor: BR.line,
    },
    keyboardDoneBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    keyboardDoneText: {
        fontFamily: BR_FONT.display,
        fontSize: 16,
        fontWeight: "600",
        color: BR.orange,
    },
    // name
    nameCard: {
        marginTop: 10,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        borderColor: BR.line,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        ...BR_SHADOW.card,
    },
    nameInput: {
        flex: 1,
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 16,
        fontFamily: BR_FONT.displayExtraBold,
        fontStyle: "italic",
        fontSize: 22,
        lineHeight: 30,
        color: BR.ink,
    },
    requiredHint: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: BR.ink3,
        paddingRight: 16,
    },
    quickFillChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        borderWidth: 1,
        borderColor: BR.line,
    },
    quickFillText: {
        fontFamily: BR_FONT.display,
        fontSize: 11,
        color: BR.ink2,
    },
    fieldError: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: BR.coral,
        marginTop: 5,
        marginLeft: 2,
    },
    // spots
    spotsCountHint: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: BR.ink3,
    },
    spotCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        paddingLeft: 14,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        borderColor: BR.line,
        ...BR_SHADOW.card,
    },
    spotBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: BR.orangeTint,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    spotBadgeText: {
        fontFamily: BR_FONT.monoBold,
        fontSize: 12,
        color: BR.orangeDeep,
    },
    spotInput: {
        flex: 1,
        fontFamily: BR_FONT.display,
        fontSize: 15,
        fontWeight: "600",
        color: BR.ink,
        paddingVertical: 2,
    },
    spotRemoveBtn: {
        width: 26,
        height: 26,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    addStopBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: BR_RADIUS.md,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: BR.line2,
    },
    addStopText: {
        fontFamily: BR_FONT.display,
        fontSize: 13,
        fontWeight: "600",
        color: BR.ink2,
    },
    spotHintRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        marginTop: 10,
    },
    spotHintText: {
        flex: 1,
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: BR.ink3,
        lineHeight: 17,
    },
    // divider
    sectionDivider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginVertical: 28,
    },
    sectionDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: BR.line2,
    },
    sectionDividerEmoji: {
        fontSize: 18,
    },
    // squads
    squadPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingLeft: 6,
        paddingRight: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: BR.card,
        borderWidth: 1,
        borderColor: BR.line,
    },
    squadPillActive: {
        backgroundColor: BR.orange,
        borderColor: BR.orange,
    },
    squadPillName: {
        fontFamily: BR_FONT.display,
        fontSize: 13,
        fontWeight: "600",
        color: BR.ink,
    },
    squadPillCount: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        color: BR.ink3,
    },
    // friends
    clearText: {
        fontFamily: BR_FONT.mono,
        fontSize: 11,
        fontWeight: "600",
        color: BR.ink3,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        borderColor: BR.line,
        ...BR_SHADOW.card,
    },
    searchInput: {
        flex: 1,
        fontFamily: BR_FONT.display,
        fontSize: 14,
        color: BR.ink,
        paddingVertical: 0,
    },
    searchClearBtn: {
        width: 22,
        height: 22,
        borderRadius: 999,
        backgroundColor: BR.paper2,
        alignItems: "center",
        justifyContent: "center",
    },
    friendList: {
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        borderColor: BR.line,
        overflow: "hidden",
        ...BR_SHADOW.card,
    },
    friendRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    friendRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: BR.line,
    },
    friendName: {
        flex: 1,
        fontFamily: BR_FONT.display,
        fontSize: 14,
        fontWeight: "600",
        color: BR.ink,
    },
    checkCircle: {
        width: 26,
        height: 26,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: BR.line2,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    showMoreBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        marginTop: 6,
    },
    showMoreText: {
        fontFamily: BR_FONT.display,
        fontSize: 12,
        fontWeight: "600",
        color: BR.orangeDeep,
    },
    // notes
    notesCard: {
        backgroundColor: BR.card,
        borderRadius: BR_RADIUS.lg,
        borderWidth: 1,
        borderColor: BR.line,
        padding: 14,
        ...BR_SHADOW.card,
    },
    notesInput: {
        fontFamily: BR_FONT.display,
        fontSize: 14,
        color: BR.ink,
        minHeight: 72,
    },
    // footer
    footer: {
        paddingHorizontal: 18,
        paddingTop: 14,
        gap: 10,
        backgroundColor: "transparent",
    },
    readyBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: "rgba(46,190,123,0.12)",
        borderWidth: 1,
        borderColor: "rgba(46,190,123,0.25)",
        alignSelf: "stretch",
    },
    readyBadgeText: {
        fontFamily: BR_FONT.mono,
        fontSize: 12,
        fontWeight: "600",
        color: BR.mintInk,
    },
    createBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 54,
        borderRadius: BR_RADIUS.md,
        backgroundColor: BR.orange,
        ...BR_SHADOW.primary,
    },
    createBtnDisabled: {
        opacity: 0.55,
        shadowOpacity: 0,
        elevation: 0,
    },
    createBtnText: {
        fontFamily: BR_FONT.display,
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
});
