import FontAwesome from "@expo/vector-icons/FontAwesome";
import {Ionicons} from "@expo/vector-icons";

export const TabBarIcon = (props: {
	name: React.ComponentProps<typeof Ionicons>["name"];
	color: string;
}) => {
	return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
};
