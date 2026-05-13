import { useState } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/convex-auth-context";
import Icon from "@/components/common/icon";
import { BrAvatar, BrCard, BrChip, BrText } from "@/components/br";
import { BR, BR_FONT, BR_RADIUS, BR_SHADOW } from "@/lib/br-theme";
import { COLORS } from "@/lib/fonts";

export default function JoinOrderPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isReady, isLoggedIn } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate the invite code
  const validation = useQuery(
    api.orderInvites.validateInvite,
    code ? { code: code.toUpperCase() } : "skip",
  );

  const joinOrder = useMutation(api.orderInvites.joinOrder);

  const handleJoin = async () => {
    if (!code) return;

    // If not logged in, redirect to sign-in with return URL
    if (!isLoggedIn) {
      router.replace(`/(auth)/sign-in?returnTo=/join/${code}`);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await joinOrder({ code: code.toUpperCase() });

      if (result.alreadyMember) {
        // User is already in the order, navigate directly
        router.replace(`/(protected)/order/${result.orderId}`);
      } else {
        // Successfully joined, navigate to order
        router.replace(`/(protected)/order/${result.orderId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join order");
      setIsJoining(false);
    }
  };

  const handleGoHome = () => {
    if (isLoggedIn) {
      router.replace("/(protected)/(tabs)");
    } else {
      router.replace("/(auth)/sign-in");
    }
  };

  // Loading state
  if (!isReady || validation === undefined) {
    return (
      <SafeAreaView edges={["top"]} style={styles.centerScreen}>
        <ActivityIndicator size="large" color={BR.orange} />
        <BrText color={BR.ink3} style={styles.loadingText}>
          Validating invite
        </BrText>
      </SafeAreaView>
    );
  }

  // Invalid invite
  if (!validation.valid) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.stateWrap}>
          <View style={[styles.stateIcon, { backgroundColor: BR.coralSoft }]}>
            <Icon name="CircleX" size={42} color={BR.coralInk} />
          </View>
          <BrText variant="h2" style={styles.stateTitle}>
            Invalid Invite
          </BrText>
          <BrText color={BR.ink3} style={styles.stateCopy}>
            {validation.error}
          </BrText>
          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [
              styles.stateButton,
              pressed && styles.pressed,
            ]}
          >
            <BrText
              color="#fff"
              weight="semibold"
              style={styles.stateButtonText}
            >
              Go to Home
            </BrText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Already a member - redirect directly
  if (validation.isAlreadyMember && validation.order) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.stateWrap}>
          <View style={[styles.stateIcon, { backgroundColor: BR.mintSoft }]}>
            <Icon name="CircleCheck" size={42} color={BR.mintInk} />
          </View>
          <BrText variant="h2" style={styles.stateTitle}>
            Already a Member
          </BrText>
          <BrText color={BR.ink3} style={styles.stateCopy}>
            You're already part of this order
          </BrText>
          <Pressable
            onPress={() =>
              router.replace(`/(protected)/order/${validation.order?.id}`)
            }
            style={({ pressed }) => [
              styles.stateButton,
              pressed && styles.pressed,
            ]}
          >
            <BrText
              color="#fff"
              weight="semibold"
              style={styles.stateButtonText}
            >
              View Order
            </BrText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Valid invite - show join preview
  const firstName = validation.creator?.firstName ?? "";
  const lastName = validation.creator?.lastName ?? "";
  const creatorName = `${firstName} ${lastName}`.trim() || "Someone";
  const participantCount = validation.order?.participantCount ?? 0;
  const participantLabel = `${participantCount} ${
    participantCount === 1 ? "person" : "people"
  } joined`;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingVertical: 10,
          position: "relative",
          marginTop: 12,
        }}
      >
        <Pressable
          onPress={handleGoHome}
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
            Join Order
          </BrText>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <BrCard padding={24} radius="xl" style={styles.card}>
          <BrAvatar
            name={creatorName}
            avatarUrl={validation.creator?.avatarUrl}
            size={82}
            ring={BR.paper}
          />

          <BrText variant="eyebrow" style={styles.hostLabel}>
            Hosted by
          </BrText>
          <BrText variant="h3" style={styles.hostName}>
            {creatorName}
          </BrText>

          <View style={styles.divider} />

          <BrText variant="eyebrow" style={styles.orderLabel}>
            ORDER
          </BrText>
          <BrText variant="h2" style={styles.orderName}>
            {validation.order?.name}
          </BrText>

          <BrChip
            color="orange"
            size="lg"
            style={styles.participantChip}
            leftSlot={<Icon name="Users" size={16} color={BR.orangeDeep} />}
          >
            {participantLabel}
          </BrChip>
        </BrCard>

        {error && (
          <View style={styles.errorBox}>
            <Icon name="CircleAlert" size={16} color={BR.coralInk} />
            <BrText color={BR.coralInk} style={styles.errorText}>
              {error}
            </BrText>
          </View>
        )}

        <TouchableOpacity
          onPress={handleJoin}
          disabled={isJoining}
          style={[styles.footerBtn, isJoining && styles.joinButtonDisabled]}
          activeOpacity={0.85}
        >
          {isJoining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.footerBtnText}>
              {isLoggedIn ? "Join Order" : "Sign In to Join"}
            </Text>
          )}
        </TouchableOpacity>

        {!isLoggedIn && (
          <BrText color={BR.ink3} style={styles.signInNote}>
            You'll be redirected to sign in first
          </BrText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: BR_RADIUS.md,
    width: "100%",
    backgroundColor: BR.orange,
    marginTop: 14,
  },
  screen: {
    flex: 1,
    backgroundColor: BR.paper,
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BR.paper,
  },
  loadingText: {
    marginTop: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: BR.paper,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BR.paper2,
    borderWidth: 1,
    borderColor: BR.line,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 72,
    right: 72,
    top: 6,
    bottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: BR_FONT.display,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: 0,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  card: {
    alignItems: "center",
  },
  hostLabel: {
    marginTop: 18,
    marginBottom: 6,
  },
  hostName: {
    textAlign: "center",
    marginBottom: 18,
  },
  divider: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: BR.line,
    marginBottom: 18,
  },
  orderLabel: {
    marginBottom: 6,
  },
  orderName: {
    textAlign: "center",
    marginBottom: 18,
  },
  participantChip: {
    alignSelf: "center",
  },
  joinButton: {
    marginTop: 22,
    minHeight: 56,
    alignSelf: "stretch",
    borderRadius: BR_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BR.orange,
    ...BR_SHADOW.primary,
  },
  joinButtonDisabled: {
    opacity: 0.65,
  },
  joinButtonText: {
    fontSize: 16,
  },
  signInNote: {
    marginTop: 14,
    textAlign: "center",
  },
  errorBox: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: BR_RADIUS.md,
    backgroundColor: BR.coralSoft,
    borderWidth: 1,
    borderColor: "rgba(255,77,109,0.24)",
  },
  errorText: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  stateIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stateTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  stateCopy: {
    textAlign: "center",
    marginBottom: 28,
  },
  stateButton: {
    minWidth: 150,
    minHeight: 54,
    paddingHorizontal: 22,
    borderRadius: BR_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BR.orange,
    ...BR_SHADOW.primary,
  },
  stateButtonText: {
    fontSize: 16,
  },
});
