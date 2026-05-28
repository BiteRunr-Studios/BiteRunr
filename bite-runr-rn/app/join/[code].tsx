import { useState } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
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
import { BR, BR_FONT_STYLE } from "@/lib/br-theme";

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
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center bg-[#FFF7EE]"
      >
        <ActivityIndicator size="large" color={BR.orange} />
        <BrText color={BR.ink3} className="mt-3.5">
          Validating invite
        </BrText>
      </SafeAreaView>
    );
  }

  // Invalid invite
  if (!validation.valid) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        <View className="flex-1 items-center justify-center px-7 pb-6">
          <View className="mb-5 h-[82px] w-[82px] items-center justify-center rounded-full bg-[#FFE0E6]">
            <Icon name="CircleX" size={42} color={BR.coralInk} />
          </View>
          <BrText variant="h2" className="mb-2 text-center">
            Invalid Invite
          </BrText>
          <BrText color={BR.ink3} className="mb-7 text-center">
            {validation.error}
          </BrText>
          <Pressable
            onPress={handleGoHome}
            className="min-h-[54px] min-w-[150px] items-center justify-center rounded-2xl bg-[#FF6A1F] px-[22px] active:scale-[0.98] active:opacity-75"
          >
            <BrText color="#fff" weight="semibold" className="text-base">
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
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
        <View className="flex-1 items-center justify-center px-7 pb-6">
          <View className="mb-5 h-[82px] w-[82px] items-center justify-center rounded-full bg-[#DDF5E8]">
            <Icon name="CircleCheck" size={42} color={BR.mintInk} />
          </View>
          <BrText variant="h2" className="mb-2 text-center">
            Already a Member
          </BrText>
          <BrText color={BR.ink3} className="mb-7 text-center">
            You're already part of this order
          </BrText>
          <Pressable
            onPress={() =>
              router.replace(`/(protected)/order/${validation.order?.id}`)
            }
            className="min-h-[54px] min-w-[150px] items-center justify-center rounded-2xl bg-[#FF6A1F] px-[22px] active:scale-[0.98] active:opacity-75"
          >
            <BrText color="#fff" weight="semibold" className="text-base">
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF7EE]">
      {/* Header */}
      <View className="relative mt-3 flex-row items-center justify-between px-[18px] py-2.5">
        <Pressable
          onPress={handleGoHome}
          className="h-9 w-9 items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0]"
        >
          <Icon name="ChevronLeft" size={20} color={BR.ink} />
        </Pressable>
        <View
          className="absolute bottom-2.5 left-0 right-0 top-2.5 items-center justify-center"
          pointerEvents="none"
        >
          <BrText
            weight="bold"
            className="text-[17px] leading-6"
            style={BR_FONT_STYLE.display}
          >
            Join Order
          </BrText>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 justify-center px-[22px] pb-6">
        <BrCard padding={24} radius="xl">
          <View className="items-center">
            <BrAvatar
              name={creatorName}
              avatarUrl={validation.creator?.avatarUrl}
              size={82}
              ring={BR.paper}
            />

            <BrText variant="eyebrow" className="mb-1.5 mt-[18px]">
              Hosted by
            </BrText>
            <BrText variant="h3" className="mb-[18px] text-center">
              {creatorName}
            </BrText>

            <View className="mb-[18px] h-px self-stretch bg-[rgba(26,20,16,0.08)]" />

            <BrText variant="eyebrow" className="mb-1.5">
              ORDER
            </BrText>
            <BrText variant="h2" className="mb-[18px] text-center">
              {validation.order?.name}
            </BrText>

            <BrChip
              color="orange"
              size="lg"
              style={{ alignSelf: "center" }}
              leftSlot={<Icon name="Users" size={16} color={BR.orangeDeep} />}
            >
              {participantLabel}
            </BrChip>
          </View>
        </BrCard>

        {error && (
          <View className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-[rgba(255,77,109,0.24)] bg-[#FFE0E6] p-3.5">
            <Icon name="CircleAlert" size={16} color={BR.coralInk} />
            <BrText
              color={BR.coralInk}
              className="flex-1 text-center font-semibold"
            >
              {error}
            </BrText>
          </View>
        )}

        <TouchableOpacity
          onPress={handleJoin}
          disabled={isJoining}
          className={`mt-3.5 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#FF6A1F] py-4 active:opacity-85 ${
            isJoining ? "opacity-65" : ""
          }`}
          activeOpacity={0.85}
        >
          {isJoining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white">
              {isLoggedIn ? "Join Order" : "Sign In to Join"}
            </Text>
          )}
        </TouchableOpacity>

        {!isLoggedIn && (
          <BrText color={BR.ink3} className="mt-3.5 text-center">
            You'll be redirected to sign in first
          </BrText>
        )}
      </View>
    </SafeAreaView>
  );
}
