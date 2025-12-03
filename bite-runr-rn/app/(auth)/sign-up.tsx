import { createUserProfile, findUserByEmail } from "@/api/profile/profile";
import { OAuthButton } from "@/components/auth/oauth-button";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { supabase } from "@/lib/supabase";
import { UserProfileType } from "@/lib/types";
import { router } from "expo-router";
import { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FieldState = {
    label: string;
    value: string;
    error: string | null;
    touched: boolean;
    show?: boolean;
};

type FormState = {
    firstName: FieldState;
    lastName: FieldState;
    email: FieldState;
    password: FieldState;
};

export default function SignUpScreen() {
    const [form, setForm] = useState<FormState>({
        firstName: {
            label: "First name",
            value: "",
            error: null,
            touched: false,
        },
        lastName: {
            label: "Last name",
            value: "",
            error: null,
            touched: false,
        },
        email: { label: "Email", value: "", error: null, touched: false },
        password: {
            label: "Password",
            value: "",
            error: null,
            touched: false,
            show: false,
        },
    });

    function onChange<K extends keyof FormState>(key: K, value: string) {
        setForm((prev) => {
            const next = { ...prev };
            next[key] = {
                ...prev[key],
                value,
                // only validate once touched
                error: prev[key].touched
                    ? validateField(key, value)
                    : prev[key].error,
            };
            return next;
        });
    }

    function onBlur<K extends keyof FormState>(key: K) {
        // mark touched and validate
        setForm((prev) => {
            const next = { ...prev };
            const field = prev[key];
            next[key] = {
                ...field,
                touched: true,
                error: validateField(key, field.value),
            };
            return next;
        });
    }

    // Loading login button state
    const [loading, setLoading] = useState(false);

    function validateField(key: keyof FormState, value: string): string | null {
        if (!value.trim()) return `${form[key].label} is required`;
        if (key === "email" && !validateEmail(value)) return "Email is invalid";
        return null;
    }

    function validateEmail(email: string) {
        const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;

        return emailRegex.test(email.trim());
    }

    async function onSignUpWithEmail() {
        setLoading(true);

        // Validate all fields
        setForm((prev) => {
            const next: FormState = { ...prev };
            (Object.keys(prev) as Array<keyof FormState>).forEach((k) => {
                next[k] = {
                    ...prev[k],
                    touched: true,
                    error: validateField(k, prev[k].value),
                };
            });
            return next;
        });

        // Check for validation errors
        const formHasErrors = (
            Object.keys(form) as Array<keyof FormState>
        ).some((k) => validateField(k, form[k].value) !== null);

        if (formHasErrors) {
            setLoading(false);
            return;
        }

        // find user by email (make api endpoint)
        console.log(form.email.value);
        const existingUser = await findUserByEmail(
            form.email.value.toLowerCase()
        );
        console.log(existingUser);

        // if user exists, then look if email is confirmed
        if (existingUser) {
            const { data } = await supabase.auth.admin.getUserById(
                existingUser.id
            );

            const emailConfirmed = data.user?.confirmed_at;
            console.log(emailConfirmed);

            //  if email is confirmed, then return as an error message on the email field, "This email is already taken"
            if (emailConfirmed) {
                // Set error for a specific field (e.g., email)
                setForm((prev) => ({
                    ...prev,
                    email: {
                        ...prev.email,
                        touched: true,
                        error: "This email is already taken",
                    },
                }));
                setLoading(false);
                return;
            }

            //  if email is not confirmed, then resend the confirmation email, and show them the confirm-sign-up.tsx page.
            supabase.auth.resend({
                type: "signup",
                email: existingUser.email,
            });
            router.push("/confirm-sign-up");
            setLoading(false);
            return;
        }

        // if user does not exist
        //  call the supabase auth sdk signUp method
        const { data, error } = await supabase.auth.signUp({
            email: form.email.value,
            password: form.password.value,
        });

        // if errors, then return errorMessage
        if (error) {
            setForm((prev) => ({
                ...prev,
                email: {
                    ...prev.email,
                    touched: true,
                    error: "An error occured while signing up",
                },
            }));
            setLoading(false);
            return;
        }

        // if no errors, then create the userProfile
        const newUserProfile = {
            id: data.user!.id,
            first_name: form.firstName.value,
            last_name: form.lastName.value,
            avatar_url: null,
        };
        const newlyCreatedUserProfile = await createUserProfile(newUserProfile);
        console.log(newlyCreatedUserProfile);
        // if (!newlyCreatedUserProfile) {
        //     setForm((prev) => ({
        //         ...prev,
        //         email: {
        //             ...prev.email,
        //             touched: true,
        //             error: "An error occured while creating profile",
        //         },
        //     }));
        //     setLoading(false);
        //     return;
        // }

        //  send the confirmation email
        // supabase.auth.resend({
        //     type: "signup",
        //     email: newlyCreatedUserProfile.email,
        // });

        // //  show the user the confirm-sign-up.tsx page
        // router.push("/confirm-sign-up");
        setLoading(false);
    }

    return (
        <SafeAreaView>
            <View className="px-4 py-6 transition-all duration-200">
                {/* Title */}
                <View className="items-center gap-2 mb-6">
                    <Image
                        className="mb-5"
                        source={require("@/assets/images/app-logo.png")}
                        style={{ width: 90, height: 45 }}
                        resizeMode="contain"
                    />
                    <Text className="text-3xl font-bold text-foreground">
                        Sign Up
                    </Text>
                    <Text className="text-lg text-muted-foreground">
                        Your favorites, ordered for the whole crew.
                    </Text>
                </View>

                <View className="mt-2" />

                <View className="flex-row items-top justify-center gap-2">
                    {/* First Name Field */}
                    <View className="flex-1">
                        <Input
                            value={form.firstName.value}
                            placeholder="First Name"
                            leftIcon="IdCard"
                            autoCapitalize="words"
                            returnKeyType="next"
                            errorMessage={form.firstName.error}
                            onChangeText={(v) => onChange("firstName", v)}
                            onBlur={() => onBlur("firstName")}
                        />
                    </View>

                    {/* Last Name Field */}
                    <View className="flex-1">
                        <Input
                            value={form.lastName.value}
                            placeholder="Last Name"
                            leftIcon="IdCard"
                            autoCapitalize="words"
                            returnKeyType="next"
                            errorMessage={form.lastName.error}
                            onChangeText={(v) => onChange("lastName", v)}
                            onBlur={() => onBlur("lastName")}
                        />
                    </View>
                </View>

                <View className="mt-2" />

                {/* Email Field*/}
                <Input
                    value={form.email.value}
                    placeholder="Email"
                    leftIcon="Mail"
                    autoCapitalize="none"
                    returnKeyType="next"
                    errorMessage={form.email.error}
                    onChangeText={(v) => onChange("email", v)}
                    onBlur={() => onBlur("email")}
                />

                <View className="mt-2" />

                {/* Password Field*/}
                <Input
                    value={form.password.value}
                    placeholder="Password"
                    leftIcon="Lock"
                    rightIcon={form.password.show ? "Eye" : "EyeClosed"}
                    onRightIconPress={() => {
                        setForm((prev) => ({
                            ...prev,
                            password: {
                                ...prev.password,
                                show: !prev.password.show,
                            },
                        }));
                    }}
                    autoCapitalize="none"
                    returnKeyType="default"
                    errorMessage={form.password.error}
                    onChangeText={(v) => onChange("password", v)}
                    onBlur={() => onBlur("password")}
                    secureTextEntry={!form.password.show}
                />

                <View className="mt-4" />

                {/* Submit Button */}
                <Button
                    variant="full"
                    icon="CirclePlus"
                    label="Continue"
                    loading={loading}
                    onPress={onSignUpWithEmail}
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

                <View className="mt-4 flex-row justify-center gap-2">
                    <Text className="text-muted-foreground">
                        Already have an account?
                    </Text>
                    <Pressable onPress={() => router.back()}>
                        <Text className="text-primary font-semibold">
                            Sign in
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
