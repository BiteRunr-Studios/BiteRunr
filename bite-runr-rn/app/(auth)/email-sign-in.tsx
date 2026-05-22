import { useCallback, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  type TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrInput, BrText } from "@/components/br";
import Icon from "@/components/common/icon";
import {
  createFormHandlers,
  type FormState,
  getAuthErrorMessage,
  validateEmail,
} from "@/lib/auth-helpers";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/convex-auth-context";
import { BR } from "@/lib/br-theme";

export default function EmailSignInScreen() {
  const { refreshSession } = useAuth();
  const [form, setForm] = useState<FormState>({
    email: { label: "Email", value: "", error: null, touched: false },
    password: { label: "Password", value: "", error: null, touched: false },
  });
  const { onChange, onBlur } = createFormHandlers(form, setForm);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleEmailSignIn = useCallback(async () => {
    const email = form.email?.value?.trim()?.toLowerCase();
    const password = form.password?.value;
    let hasError = false;
    const newForm = { ...form };

    if (!email) {
      const emailField = newForm.email;
      if (!emailField) return;
      newForm.email = {
        ...emailField,
        error: "Email is required",
        touched: true,
      };
      hasError = true;
    } else if (!validateEmail(email)) {
      const emailField = newForm.email;
      if (!emailField) return;
      newForm.email = {
        ...emailField,
        error: "Invalid email address",
        touched: true,
      };
      hasError = true;
    }
    if (!password) {
      const passwordField = newForm.password;
      if (!passwordField) return;
      newForm.password = {
        ...passwordField,
        error: "Password is required",
        touched: true,
      };
      hasError = true;
    }
    if (hasError || !email || !password) {
      setForm(newForm);
      return;
    }

    setLoading(true);
    try {
      const response = await authClient.signIn.email({
        email,
        password,
      });
      if (response.error) {
        throw new Error(response.error.message || "Sign in failed");
      }
      await refreshSession();
    } catch (error) {
      const errorResult = getAuthErrorMessage(error, "signIn");
      if (errorResult.field === "email") {
        setForm((prev) => ({
          ...prev,
          email: prev.email
            ? { ...prev.email, error: errorResult.message, touched: true }
            : prev.email,
        }));
      } else if (errorResult.field === "password") {
        setForm((prev) => ({
          ...prev,
          password: prev.password
            ? { ...prev.password, error: errorResult.message, touched: true }
            : prev.password,
        }));
      } else {
        Alert.alert("Sign In Error", errorResult.message);
      }
    } finally {
      setLoading(false);
    }
  }, [form, refreshSession]);

  return (
    <View className="flex-1 bg-[#FFF7EE]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="px-[22px] pt-2 pb-8"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => router.back()}
              className="w-[38px] h-[38px] rounded-full bg-[#FCEFE0] items-center justify-center"
            >
              <Icon name="ChevronLeft" size={20} color={BR.ink} />
            </Pressable>

            <View className="mt-[18px]">
              <BrText variant="eyebrow">Sign in with email</BrText>
              <BrText variant="h1" className="mt-2">
                Welcome back.
              </BrText>
              <BrText className="mt-2 text-sm leading-[21px] text-[#4A3C32]">
                Pick up where the squad left off.
              </BrText>
            </View>

            <View className="mt-6 gap-3">
              <BrInput
                value={form.email?.value}
                placeholder="Email"
                leftIcon="Mail"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                errorMessage={form.email?.error}
                onChangeText={(v) => onChange("email", v)}
                onBlur={() => onBlur("email")}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <BrInput
                ref={passwordRef}
                value={form.password?.value}
                placeholder="Password"
                leftIcon="Lock"
                secureTextEntry
                returnKeyType="done"
                errorMessage={form.password?.error}
                onChangeText={(v) => onChange("password", v)}
                onBlur={() => onBlur("password")}
                onSubmitEditing={handleEmailSignIn}
              />
            </View>

            <View className="mt-[18px]">
              <Pressable
                onPress={handleEmailSignIn}
                disabled={loading}
                className={`flex-row gap-2 justify-center items-center p-4 w-full rounded-2xl h-[55px] bg-primary active:opacity-80 ${
                  loading ? "opacity-50" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-lg font-semibold text-white">
                    Sign in
                  </Text>
                )}
              </Pressable>
            </View>

            <View className="flex-row gap-2 justify-center items-center mt-[18px]">
              <BrText className="text-[#8A7A6E]">No account?</BrText>
              <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                <BrText weight="semibold" className="text-[#E8551A]">
                  Sign up
                </BrText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
