import { Pressable, Text, View } from "react-native";
import Icon, { type IconName } from "@/components/common/icon";
import { BR } from "@/lib/br-theme";

/**
 * Round icon button used in tab headers (Home scan, Account settings…).
 * Shared so every top-bar action shares one size / border / pressed style.
 */
export function BrIconButton({
  name,
  onPress,
  badge,
  accessibilityLabel,
}: {
  name: IconName;
  onPress?: () => void;
  badge?: number;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(26,20,16,0.08)] bg-[#FCEFE0] active:opacity-[0.82]"
    >
      <Icon name={name} size={18} color={BR.ink} />
      {badge && badge > 0 ? (
        <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-lg border-[1.5px] border-[#FFF7EE] bg-[#FF4D6D] px-1">
          <Text className="text-[9px] font-extrabold text-white">{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
