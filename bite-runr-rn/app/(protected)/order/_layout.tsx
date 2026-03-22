import { Stack } from "expo-router";

export default function OrderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackButtonMenuEnabled: false,
        freezeOnBlur: true,
      }}
    />
  );
}
