import {
  View,
  Text,
  useColorScheme,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";

import TextField from "@/components/TextField";
import Button from "@/components/Button"

export default function TabTwoScreen() {
  const colorScheme = useColorScheme(); // 'light' or 'dark'
  const themeColors = Colors[colorScheme ?? "light"];

  return (
    <SafeAreaView style={{ padding: Spacing.pagePadding }}>
      <Text
        style={{
          marginBottom: Spacing.pageTitleMarginBottom,
          fontSize: 22,
          fontWeight: "500",
          color: themeColors.text,
        }}
      >
        Create Group
      </Text>
      <ScrollView>
        <View style={{ gap: 20 }}>
          <View style={{ gap: 10 }}>
            <TextField placeHolderName="Name" sfSymbolName="tag" />
            <TextField
              placeHolderName="Comments"
              isMultiline={true}
              sfSymbolName="bubble"
            />
          </View>

          <Button
            label="Create Group"
            sfSymbolName="plus.circle"
            action={() => {
              console.log("Group created!");
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
