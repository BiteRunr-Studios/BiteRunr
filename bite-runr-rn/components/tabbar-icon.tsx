import { Ionicons } from "@expo/vector-icons";

export const TabBarIcon = (props: {
    name: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
}) => {
    return <Ionicons size={24} {...props} />;
};
