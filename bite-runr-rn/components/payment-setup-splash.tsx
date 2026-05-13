import { View, Text, Modal, Pressable } from "react-native";
import Icon from "@/components/common/icon";
import { Button } from "@/components/common/button";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";

type PaymentSetupSplashProps = {
  visible: boolean;
  onSetUp: () => void;
  onSkip: () => void;
};

const FEATURES = [
  {
    icon: "CreditCard" as const,
    title: "Accept card payments",
    desc: "Group members pay their share with a tap — no cash or Venmo needed.",
    color: "#a855f7",
  },
  {
    icon: "Zap" as const,
    title: "Instant payouts",
    desc: "Cash out to your debit card whenever you want.",
    color: "#22c55e",
  },
  {
    icon: "ShieldCheck" as const,
    title: "Secure & simple",
    desc: "Powered by Stripe. Setup takes about 2 minutes.",
    color: "#3b82f6",
  },
];

export function PaymentSetupSplash({
  visible,
  onSetUp,
  onSkip,
}: PaymentSetupSplashProps) {
  const { colorScheme } = useColorScheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onSkip}
    >
      <View className="flex-1 bg-background px-6 pt-12 pb-10 justify-between">
        {/* Top content */}
        <View className="flex-1 justify-center">
          {/* Hero icon */}
          <View className="items-center mb-8">
            <View
              className="items-center justify-center w-20 h-20 rounded-3xl"
              style={{
                backgroundColor: "#a855f7" + "15",
              }}
            >
              <Icon name="Wallet" size={40} color="#a855f7" />
            </View>
          </View>

          {/* Headline */}
          <Text className="text-3xl font-bold text-foreground text-center mb-3">
            Get Paid by Your Group
          </Text>
          <Text className="text-base text-muted-foreground text-center mb-10">
            Set up payments so group members can pay you directly when you run
            an order.
          </Text>

          {/* Feature bullets */}
          <View className="gap-5">
            {FEATURES.map((feature) => (
              <View key={feature.title} className="flex-row gap-4 items-start">
                <View
                  className="items-center justify-center w-10 h-10 rounded-xl"
                  style={{
                    backgroundColor: `${feature.color}15`,
                  }}
                >
                  <Icon name={feature.icon} size={20} color={feature.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {feature.title}
                  </Text>
                  <Text className="text-sm text-muted-foreground mt-0.5">
                    {feature.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom CTAs */}
        <View className="gap-3 mt-8">
          <Button
            label="Set Up Payments"
            icon="ArrowRight"
            onPress={onSetUp}
            color={NAV_THEME[colorScheme].primary}
          />
          <Pressable
            onPress={onSkip}
            className="items-center py-3 active:opacity-70"
          >
            <Text className="text-base text-muted-foreground">
              Skip for Now
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
