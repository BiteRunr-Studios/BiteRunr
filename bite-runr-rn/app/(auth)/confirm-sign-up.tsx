import { View, Text, Image, Pressable, Alert } from "react-native";
import { Button } from "@/components/common/button";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function ConfirmSignUpScreen() {
    const { data: isConfirmed } = useQuery({
        queryKey: ["emailConfirmation"],
        queryFn: async () => {
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();
            if (error) throw error;
            return !!user?.email_confirmed_at;
        },
        refetchInterval: 3000,
    });

    useEffect(() => {
        if (isConfirmed) router.push("/(auth)/sign-in");
    }, [isConfirmed]);

    const [isResending, setIsResending] = useState(false);

    const handleResendLink = async () => {
        setIsResending(true);

        // Get the current user's email
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            Alert.alert("Error", "No email found. Please sign up again.");
            router.back();
            return;
        }

        // Resend the confirmation email
        const { error } = await supabase.auth.resend({
            type: "signup",
            email: user.email,
        });

        if (error) throw error;

        setIsResending(false);
    };

    const handleGoToLogin = () => {
        router.dismissAll();
    };

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
                One last thing...
            </Text>

            {/* Description */}
            <Text className="text-center text-lg text-muted-foreground">
                We need to confirm your email in order to activate your account.
                Check your email and click the activation link.
            </Text>

            <View className="flex-1" />

            {/* Resend link */}
            <View className="mt-4 flex-row justify-center gap-2">
                <Text className="text-muted-foreground">
                    Didn't get the email?
                </Text>
                <Pressable onPress={handleResendLink}>
                    <Text className="text-primary font-semibold">
                        {isResending ? "Sending..." : "Resend link"}
                    </Text>
                </Pressable>
            </View>

            <View className="mb-5" />

            {/* Go to login button */}
            <Button
                variant="full"
                label="Go to login"
                onPress={handleGoToLogin}
            />
        </SafeAreaView>
    );
}
