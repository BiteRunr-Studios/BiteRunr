import { IconSymbol } from "@/components/ui/IconSymbol";
import { getFriends } from "@/Services/api";
import useFetch from "@/Services/useFetch";
import { View, Text, ScrollView, ActivityIndicator, useColorScheme, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@clerk/clerk-expo";
import FriendRow from "@/components/ui/FriendRow";

export default function FriendsScreen() {
    const { userId } = useAuth();
    const colorScheme = useColorScheme();
    const backgroundColor = Colors[colorScheme ?? "light"].background;
    const textColor = Colors[colorScheme ?? "light"].text;
    const { data: friends, loading: friendsLoading, error: friendsError } = useFetch(() => getFriends(userId ?? ""));
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor }}>
            <Text style={{ color: textColor }} className="text-2xl text-center font-semibold">Friends</Text>
           
           {friendsLoading ? (
            <ActivityIndicator size="large" color={textColor} className="mt-10 self-center" />
           ) : friendsError ? (
            <Text className="text-red-500 text-center mt-10">Error: {friendsError.message}</Text>
           ) : (
            <ScrollView>
                {(friends ?? []).map((friend: any) => (
                    <FriendRow key={friend.id} friend={friend} textColor={textColor} />
                ))}
            </ScrollView>
           )}
        </SafeAreaView>
    );
}
