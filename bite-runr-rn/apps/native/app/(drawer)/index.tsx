import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Container } from "@/components/container";

export default function Home() {
	return (
		<Container>
			<ScrollView className="flex-1">
				<View className="px-4">
					<Text className="font-mono text-foreground text-3xl font-bold mb-4">
						BETTER T STACK
					</Text>

					<View className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm"></View>
				</View>
			</ScrollView>
		</Container>
	);
}
