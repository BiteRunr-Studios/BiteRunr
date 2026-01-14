import { View, Text, Image } from "react-native";
import { Button } from "@/components/common/button";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useContext, useEffect } from "react";
import { AuthContext } from "@/lib/convex-auth-context";

export default function ConfirmSignUpScreen() {
    const { isLoggedIn, pendingAuth } = useContext(AuthContext);

    // If user is already logged in, redirect to protected tabs
    useEffect(() => {
        if (isLoggedIn) {
            router.replace("/(protected)/(tabs)");
        }
    }, [isLoggedIn]);

    // If no pending auth, redirect to sign in
    if (!pendingAuth?.email) {
        return <Redirect href={"/sign-in"} />;
    }

    return (
        <SafeAreaView className="flex-1 px-6 justify-center items-center">
            <View className="flex-1" />
            {/* Email Icon */}
            <Image
                className="mb-5"
                source={require("@/assets/images/mail-icon.png")}
                style={{ width: 240, height: 160 }}
                resizeMode="cover"
            />

            {/* Title */}
            <Text className="text-3xl font-bold text-foreground mb-4 text-center">
                Account Created!
            </Text>

            {/* Description */}
            <Text className="text-center text-lg text-muted-foreground">
                Your account has been created successfully. You can now sign in
                with your credentials.
            </Text>

            <View className="flex-1" />

            <View className="mb-5" />

            {/* Go to login button */}
            <Button
                variant="full"
                label="Go to login"
                onPress={() => router.dismissAll()}
            />
        </SafeAreaView>
    );
}
