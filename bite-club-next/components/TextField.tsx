import * as Icons from "lucide-react";
import Icon from "./Icon";
import { ButtonHTMLAttributes, Component } from "react";

const iconNames = Object.keys(Icons).filter((key) => {
    const icon = Icons[key as keyof typeof Icons];
    return (
        (typeof icon === "object" || typeof icon === "function") &&
        "displayName" in icon
    );
}) as Array<keyof typeof Icons>;

type IconName = (typeof iconNames)[number];

type Props = {
    placeholderLabel: string;
    lucideIconName?: IconName;
    isMultiline?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function TextField({
    placeholderLabel,
    lucideIconName,
    isMultiline = false,
    ...rest
}: Props) {}

// import { View, TextInput, useColorScheme } from "react-native";

// import { Colors } from "@/constants/Colors";
// import { Spacing } from "@/constants/Spacing";
// import { IconSymbol, IconSymbolName } from "@/components/ui/IconSymbol";

// type Props = {
//   placeHolderName: string;
//   sfSymbolName: IconSymbolName;
//   isMultiline?: boolean;
//   errorMessage?: string;
// };

// const TextField: React.FC<Props> = ({
//   placeHolderName,
//   sfSymbolName,
//   isMultiline = false,
//   errorMessage = null,
// }) => {
//   const colorScheme = useColorScheme(); // 'light' or 'dark'
//   const themeColors = Colors[colorScheme ?? "light"];

//   return (
//     <View
//       style={{
//         flexDirection: "row",
//         alignItems: "center",
//         borderWidth: 1,
//         borderColor: themeColors.inputFieldBorder,
//         borderRadius: 10,
//         padding: Spacing.formFieldPadding,
//       }}
//     >
//       <TextInput
//         multiline={isMultiline}
//         style={{
//           flex: 1,
//           color: themeColors.text,
//           fontSize: 18,
//         }}
//         placeholder={placeHolderName}
//         placeholderTextColor={themeColors.text}
//       />
//       <IconSymbol
//         size={28}
//         weight="light"
//         name={sfSymbolName}
//         color={themeColors.text}
//       />
//     </View>
//   );
// };

// export default TextField;
