import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { View, Text, Image } from "react-native";
import Icon from "./common/icon";

type OrderStatus = "created" | "active" | "completed" | "cancelled";

interface OrderUser {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
}

interface OrderCardProps {
    id: string;
    name: string;
    comments?: string | null;
    status: OrderStatus;
    paused: boolean;
    createdAt: number | Date;
    orderUsers?: OrderUser[];
}

export function OrderCard({
    name,
    comments,
    status,
    createdAt,
    orderUsers,
}: OrderCardProps) {
    const isCancelled = status === "cancelled";
    const isActive = status === "active";
    const { colorScheme } = useColorScheme();

    const createdDate = typeof createdAt === "number" ? new Date(createdAt) : createdAt;

    return (
        <View className="flex-col w-full gap-2 p-4 border rounded-2xl border-muted bg-card">
            <View className="flex-row justify-between">
                <Text className="text-lg text-muted-foreground">
                    {`${createdDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })} · ${createdDate.toLocaleTimeString(
                        "en-US",
                        {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                        }
                    )}`}
                </Text>
                <Icon
                    name="CircleArrowRight"
                    size={24}
                    color={`${
                        isCancelled
                            ? NAV_THEME[colorScheme].notification
                            : isActive
                            ? NAV_THEME[colorScheme].primary
                            : NAV_THEME[colorScheme].border
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
                            : NAV_THEME[colorScheme].border
                    }`}>
                    <Icon
                        name="Package"
                        size={24}
                        color={
                            isCancelled
                                ? NAV_THEME[colorScheme].notification
                                : isActive
                                ? NAV_THEME[colorScheme].primary
                                : NAV_THEME[colorScheme].text
                        }
                    />
                </View>

                <Text className="w-full text-3xl font-semibold truncate text-foreground">
                    {name}
                </Text>
            </View>
            {comments && (
                <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                    {comments}
                </Text>
            )}
            {orderUsers && orderUsers.length > 0 && (
                <View className="flex-row items-center">
                    {orderUsers
                        .slice(0, orderUsers.length > 4 ? 3 : 4)
                        .map((orderUser, idx) => (
                            <View
                                key={orderUser.id}
                                style={{
                                    marginLeft: idx > 0 ? -18 : 0,
                                    backgroundColor:
                                        NAV_THEME[colorScheme].background,
                                }}
                                className="border-2 rounded-full border-card">
                                <Image
                                    style={{
                                        width: 36,
                                        height: 36,
                                    }}
                                    className="rounded-full"
                                    source={{
                                        uri:
                                            orderUser.avatarUrl ??
                                            `https://ui-avatars.com/api/?name=${orderUser.firstName ?? ""}+${orderUser.lastName ?? ""}&background=FFE7CC&color=000`,
                                    }}
                                />
                            </View>
                        ))}
                    {orderUsers.length > 4 && (
                        <View
                            style={{
                                marginLeft: -18,
                                width: 36,
                                height: 36,
                            }}
                            className="flex items-center justify-center border-2 rounded-full border-card bg-primary">
                            <Text className="text-xs font-semibold text-foreground">
                                +{orderUsers.length - 3}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
