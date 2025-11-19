import { NAV_THEME } from "@/lib/constants";
import { Order, OrderStatus } from "@/lib/types";
import { Feather } from "@expo/vector-icons";
import { View, Text, Image } from "react-native";

export function OrderCard(order: Order) {
    const isCancelled = order.status === OrderStatus.Cancelled;
    const isActive = order.status === OrderStatus.Active;

    return (
        <View
            className={
                "flex-col w-full gap-2 p-4 border rounded-2xl border-muted bg-card"
            }>
            <View className="flex-row justify-between">
                <Text className="text-lg text-muted-foreground">
                    {`${new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })} · ${new Date(order.created_at).toLocaleTimeString(
                        "en-US",
                        {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                        }
                    )}`}
                </Text>
                <Feather
                    name="arrow-right-circle"
                    size={24}
                    color={`${
                        isCancelled
                            ? "#ef4444"
                            : isActive
                            ? "hsl(32 100% 50%)"
                            : "hsl(217.2 32.6% 17.5%)"
                    }`}
                />
            </View>
            <View className="flex-row items-center justify-start gap-2">
                <View
                    className={`flex items-center justify-center w-12 h-12 rounded-2xl ${
                        isCancelled
                            ? "bg-red-500/20"
                            : isActive
                            ? "bg-primary/20"
                            : "bg-muted"
                    }`}>
                    <Feather
                        name="package"
                        size={24}
                        color={
                            isCancelled
                                ? "#ef4444"
                                : isActive
                                ? NAV_THEME.dark.primary
                                : NAV_THEME.dark.muted
                        }
                    />
                </View>

                <Text className="w-full text-3xl font-semibold truncate text-foreground">
                    {order.name}
                </Text>
            </View>
            <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                {order.comments}
            </Text>
            <View className="flex-row items-center">
                {order
                    .orderUsers!.slice(0, order.orderUsers!.length > 4 ? 3 : 4)
                    .map((order_user, idx) => (
                        <View
                            key={idx}
                            style={{
                                marginLeft: idx > 0 ? -18 : 0,
                            }}
                            className="border-2 rounded-full border-card bg-background">
                            <Image
                                style={{ width: 36, height: 36 }}
                                className="rounded-full"
                                source={{
                                    uri:
                                        order_user.user?.avatar_url ??
                                        `https://ui-avatars.com/api/?name=${order_user.user?.first_name}+${order_user.user?.last_name}`,
                                }}
                            />
                        </View>
                    ))}
                {order.orderUsers!.length > 4 && (
                    <View
                        style={{
                            marginLeft: -18,
                            width: 36,
                            height: 36,
                        }}
                        className="flex items-center justify-center border-2 rounded-full border-card bg-primary">
                        <Text className="text-xs font-semibold text-foreground">
                            +{order.orderUsers!.length - 3}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}
