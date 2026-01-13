import { createUserProfile, findUserByEmail } from "@/api/profile/profile";
import { OAuthButton } from "@/components/auth/oauth-button";
import { Button } from "@/components/common/button";
import Icon from "@/components/common/icon";
import { Input } from "@/components/common/input";
import { NAV_THEME } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/lib/supabase-auth-context";
import { useColorScheme } from "@/lib/use-color-scheme";
import { router } from "expo-router";
import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SignupFormData = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
};

export default function SignUpScreen() {
    const { setPendingAuth } = useContext(AuthContext);
    const { colorScheme } = useColorScheme();
    const { control, handleSubmit, setError } = useForm<SignupFormData>({
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
        },
    });
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    async function onSignUpWithEmail(data: SignupFormData) {
        if (loading) return;

        setLoading(true);

        // find user by email (make api endpoint)
        const existingUser = await findUserByEmail(data.email.toLowerCase());

        // if user exists, then look if email is confirmed
        if (existingUser) {
            //  if email is confirmed, then return as an error message on the email field, "This email is already taken"
            if (existingUser.email_confirmed_at) {
                // Set error for a specific field (e.g., email)
                setError("email", {
                    type: "manual",
                    message: "This email is already taken",
                });
                setLoading(false);
                return;
            }

            //  if email is not confirmed, then resend the confirmation email, and show them the confirm-sign-up.tsx page.
            supabase.auth.resend({
                type: "signup",
                email: existingUser.email,
            });
            setPendingAuth({
                email: data.email,
                password: data.password,
            });
            router.push("/(auth)/confirm-sign-up");
            setLoading(false);
            return;
        }

        // if user does not exist
        //  call the supabase auth sdk signUp method
        const { data: authData, error: authError } = await supabase.auth.signUp(
            {
                email: data.email,
                password: data.password,
            }
        );

        // if errors, then return errorMessage
        if (authError) {
            setError("email", {
                type: "manual",
                message: authError.message,
            });
            setLoading(false);
            return;
        }

        // if no errors, then create the userProfile
        const newUserProfile = {
            id: authData.user!.id,
            first_name: data.firstName,
            last_name: data.lastName,
            avatar_url: null,
        };
        const newlyCreatedUserProfile = await createUserProfile(newUserProfile);
        if (!newlyCreatedUserProfile) {
            setError("email", {
                type: "manual",
                message: "An error occured while creating profile",
            });
            setLoading(false);
            return;
        }

        //  send the confirmation email
        supabase.auth.resend({
            type: "signup",
            email: newlyCreatedUserProfile.email,
        });

        //  show the user the confirm-sign-up.tsx page
        setPendingAuth({
            email: data.email,
            password: data.password,
        });
        router.push("/(auth)/confirm-sign-up");
        setLoading(false);
    }

    return (
        <SafeAreaView className="flex-1 px-6 justify-center transition-all duration-200">
            <View className="mt-10"></View>
            {/* Title */}
            <Text className="text-3xl font-bold text-foreground mb-2">
                Sign Up
            </Text>
            <Text className="text-lg text-muted-foreground">
                Your favorites, ordered for the whole crew.
            </Text>

            <View className="mt-8" />

            <View className="flex-row items-top justify-center gap-2">
                {/* First Name Field */}
                <View className="flex-1">
                    <Input
                        name="firstName"
                        control={control}
                        placeholder="First Name"
                        leftIcon="IdCard"
                        autoCapitalize="words"
                        returnKeyType="next"
                        rules={{ required: "First name is required" }}
                    />
                </View>

                {/* Last Name Field */}
                <View className="flex-1">
                    <Input
                        name="lastName"
                        control={control}
                        placeholder="Last Name"
                        leftIcon="IdCard"
                        autoCapitalize="words"
                        returnKeyType="next"
                        rules={{ required: "Last name is required" }}
                    />
                </View>
            </View>

            <View className="mt-2" />

            {/* Email Field*/}
            <Input
                name="email"
                control={control}
                placeholder="Email"
                leftIcon="Mail"
                autoCapitalize="none"
                returnKeyType="next"
                rules={{
                    required: "Email is required",
                    pattern: {
                        value: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/,
                        message: "Email is invalid",
                    },
                }}
            />

            <View className="mt-2" />

            {/* Password Field*/}
            <Input
                name="password"
                control={control}
                placeholder="Password"
                leftIcon="Lock"
                rightIcon={showPassword ? "EyeClosed" : "Eye"}
                onRightIconPress={() => setShowPassword((prev) => !prev)}
                autoCapitalize="none"
                returnKeyType="default"
                secureTextEntry={!showPassword}
                rules={{
                    required: "Password is required",
                    pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message:
                            "Password must have uppercase, lowercase, and number",
                    },
                }}
            />

            <View className="mt-4" />

            {/* Submit Button */}
            <Button
                variant="full"
                label="Continue"
                loading={loading}
                onPress={handleSubmit(onSignUpWithEmail)}
            />

            <View className="mt-8" />

            <View className="flex-row items-center justify-between gap-3">
                <View className="bg-muted h-[1px] flex-grow"></View>
                <Text className="text-muted-foreground italic">OR</Text>
                <View className="bg-muted h-[1px] flex-grow"></View>
            </View>

            <View className="mt-8" />

            {/* GitHub Auth Button */}
            <OAuthButton provider="github" />

            <View className="mt-3" />

            {/* Google Auth Button */}
            <OAuthButton provider="google" />

            <View className="mt-4 flex-row items-center justify-center gap-2">
                <Text className="text-muted-foreground">
                    Already have an account?
                </Text>
                <Pressable
                    className="flex-row items-center gap-1"
                    onPress={() => router.back()}
                >
                    <Icon
                        name="ArrowLeft"
                        size={15}
                        color={NAV_THEME[colorScheme].primary}
                    />
                    <Text className="text-primary font-semibold">Sign in</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
