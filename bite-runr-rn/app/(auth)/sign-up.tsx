import { useState, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  type TextInput,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { BrInput, BrText } from "@/components/br";
import {
  createFormHandlers,
  type FormState,
  validateEmail,
  getAuthErrorMessage,
} from "@/lib/auth-helpers";
import { useAuth } from "@/lib/convex-auth-context";
import { authClient } from "@/lib/auth-client";
import Icon from "@/components/common/icon";
import { BR } from "@/lib/br-theme";

export default function SignUpScreen() {
  const { setIsSigningUp } = useAuth();
  const [form, setForm] = useState<FormState>({
    firstName: { label: "First name", value: "", error: null, touched: false },
    lastName: { label: "Last name", value: "", error: null, touched: false },
    email: { label: "Email", value: "", error: null, touched: false },
    password: { label: "Password", value: "", error: null, touched: false },
  });
  const { onChange, onBlur } = createFormHandlers(form, setForm);
  const [loading, setLoading] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignUp = useCallback(async () => {
    const firstName = form.firstName?.value?.trim();
    const lastName = form.lastName?.value?.trim();
    const email = form.email?.value?.trim().toLowerCase();
    const password = form.password?.value;

    let hasError = false;
    const newForm = { ...form };

    if (!firstName) {
      const firstNameField = newForm.firstName;
      if (!firstNameField) return;
      newForm.firstName = {
        ...firstNameField,
        error: "First name is required",
        touched: true,
      };
      hasError = true;
    }
    if (!lastName) {
      const lastNameField = newForm.lastName;
      if (!lastNameField) return;
      newForm.lastName = {
        ...lastNameField,
        error: "Last name is required",
        touched: true,
      };
      hasError = true;
    }
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
    } else if (password.length < 8) {
      const passwordField = newForm.password;
      if (!passwordField) return;
      newForm.password = {
        ...passwordField,
        error: "Must be at least 8 characters",
        touched: true,
      };
      hasError = true;
    }

    if (hasError || !firstName || !lastName || !email || !password) {
      setForm(newForm);
      return;
    }

    setLoading(true);
    setIsSigningUp(true);
    try {
      const response = await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
      });
      if (response.error) {
        throw new Error(response.error.message || "Failed to create account");
      }
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { email, type: "sign-up" },
      });
    } catch (error) {
      setIsSigningUp(false);
      const errorResult = getAuthErrorMessage(error, "signUp");
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
        Alert.alert("Sign Up Error", errorResult.message);
      }
    } finally {
      setLoading(false);
    }
  }, [form, setIsSigningUp]);

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
              className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FCEFE0]"
            >
              <Icon name="ChevronLeft" size={20} color={BR.ink} />
            </Pressable>

            <View className="mt-[18px]">
              <BrText variant="eyebrow">Create your account</BrText>
              <BrText variant="h1" className="mt-2 text-[36px]">
                Hey,{" "}
                <BrText
                  variant="h1"
                  italic
                  className="text-[36px] text-[#FF6A1F]"
                >
                  hi.
                </BrText>
              </BrText>
              <BrText className="mt-2 text-sm leading-[21px] text-[#4A3C32]">
                One run for the whole crew. Order, scan, settle.
              </BrText>
            </View>

            <View className="mt-6 gap-3">
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <BrInput
                    value={form.firstName?.value}
                    placeholder="First name"
                    leftIcon="IdCard"
                    autoCapitalize="words"
                    returnKeyType="next"
                    errorMessage={form.firstName?.error}
                    onChangeText={(v) => onChange("firstName", v)}
                    onBlur={() => onBlur("firstName")}
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                  />
                </View>
                <View className="flex-1">
                  <BrInput
                    ref={lastNameRef}
                    value={form.lastName?.value}
                    placeholder="Last name"
                    leftIcon="IdCard"
                    autoCapitalize="words"
                    returnKeyType="next"
                    errorMessage={form.lastName?.error}
                    onChangeText={(v) => onChange("lastName", v)}
                    onBlur={() => onBlur("lastName")}
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </View>

              <BrInput
                ref={emailRef}
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
                placeholder="Password (8+ chars)"
                leftIcon="Lock"
                secureTextEntry
                returnKeyType="done"
                errorMessage={form.password?.error}
                onChangeText={(v) => onChange("password", v)}
                onBlur={() => onBlur("password")}
                onSubmitEditing={handleSignUp}
              />
            </View>

            <View className="mt-[18px]">
              <Pressable
                onPress={handleSignUp}
                disabled={loading}
                className={`h-[55px] w-full flex-row items-center justify-center gap-2 rounded-2xl bg-primary p-4 active:opacity-80 ${
                  loading ? "opacity-50" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="Continue"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text className="text-lg font-semibold text-white">
                      Continue
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View className="mt-[18px] flex-row items-center justify-center gap-2">
              <BrText className="text-[#8A7A6E]">
                Already have an account?
              </BrText>
              <Pressable
                onPress={() => router.back()}
                className="flex-row items-center gap-1"
              >
                <BrText weight="semibold" className="text-[#E8551A]">
                  Sign in
                </BrText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
