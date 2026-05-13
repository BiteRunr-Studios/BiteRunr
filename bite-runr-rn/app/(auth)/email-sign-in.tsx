import { useCallback, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
    <View style={{ flex: 1, backgroundColor: BR.paper }}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="ChevronLeft" size={20} color={BR.ink} />
            </Pressable>

            <View style={{ marginTop: 18 }}>
              <BrText variant="eyebrow">Sign in with email</BrText>
              <BrText variant="h1" style={{ marginTop: 8 }}>
                Welcome back.
              </BrText>
              <BrText
                style={{
                  color: BR.ink2,
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                Pick up where the squad left off.
              </BrText>
            </View>

            <View style={{ marginTop: 24, gap: 12 }}>
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

            <View style={{ marginTop: 18 }}>
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

            <View style={styles.signupRow}>
              <BrText style={{ color: BR.ink3 }}>No account?</BrText>
              <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                <BrText weight="semibold" color={BR.orangeDeep}>
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

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: BR.paper2,
    alignItems: "center",
    justifyContent: "center",
  },
  signupRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
});
