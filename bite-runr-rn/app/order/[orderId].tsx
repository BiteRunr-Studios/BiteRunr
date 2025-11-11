import { Alert, View } from "react-native";
import { PageWithHeader } from "@/components/page-with-header";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Order } from "@/lib/types";
import { getOrders } from "@/api/groups/orders";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";

export default function SpecificOrder() {
    const { isDarkColorScheme } = useColorScheme();
    const { orderId } = useLocalSearchParams();

    const { data, isPending, isError, error } = useQuery<Order>({
        queryKey: ["order"],
        queryFn: getOrders,
    });

    return (
        <PageWithHeader
            title="Account"
            logoSource={require("@/assets/images/app-logo.png")}
            onLogoPress={() => Alert.alert("Logo pressed")}
            onBellPress={() => Alert.alert("Notifications")}>
            <View className="flex-1 px-6">
                <View className="flex-1 py-2"></View>
            </View>
        </PageWithHeader>
    );
}
