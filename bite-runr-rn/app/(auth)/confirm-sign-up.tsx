import { View, Text, Image, Pressable } from "react-native";
import { Button } from "@/components/common/button";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { findUserByEmail } from "@/api/profile/profile";

export default function ConfirmSignUpScreen() {
    const { email, password } = useLocalSearchParams<{
        email: string;
        password: string;
    }>();

    const [resendCooldown, setResendCooldown] = useState(60);
    const hasSignedIn = useRef(false);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const { data: isConfirmed, isLoading } = useQuery({
        queryKey: ["emailConfirmation"],
        queryFn: async () => {
            const user = await findUserByEmail(email);
            if (!user) throw new Error();
            return !!user.email_confirmed_at;
        },
        refetchInterval: 3000,
        enabled: !!email,
    });

    useEffect(() => {
        async function signInUser() {
            if (isConfirmed === true && !hasSignedIn.current && !isLoading) {
                hasSignedIn.current = true;

                const { error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    hasSignedIn.current = false;
                    router.replace("/(auth)/sign-in");
                    return;
                }
            }
        }

        signInUser();
    }, [isConfirmed, isLoading]);

    const handleResendLink = async () => {
        if (resendCooldown > 0) return;
        // Resend the confirmation email
        const { error } = await supabase.auth.resend({
            type: "signup",
            email: email,
        });

        if (error) {
            console.log(error.message);
            return;
        }

        setResendCooldown(60);
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
                <Pressable
                    onPress={handleResendLink}
                    disabled={resendCooldown > 0}
                >
                    <Text
                        className={`font-semibold ${
                            resendCooldown > 0
                                ? "text-muted-foreground"
                                : "text-primary"
                        }`}
                    >
                        {resendCooldown > 0
                            ? `Resend link (${resendCooldown}s)`
                            : "Resend link"}
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
