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
  StyleSheet,
} from "react-native";
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
    <View style={{ flex: 1, backgroundColor: BR.paper }}>
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
              <BrText variant="eyebrow">Create your account</BrText>
              <BrText variant="h1" style={{ marginTop: 8, fontSize: 36 }}>
                Hey,{" "}
                <BrText
                  variant="h1"
                  italic
                  color={BR.orange}
                  style={{ fontSize: 36 }}
                >
                  hi.
                </BrText>
              </BrText>
              <BrText
                style={{
                  fontSize: 14,
                  color: BR.ink2,
                  marginTop: 8,
                  lineHeight: 21,
                }}
              >
                One run for the whole crew. Order, scan, settle.
              </BrText>
            </View>

            <View style={{ marginTop: 24, gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
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
                <View style={{ flex: 1 }}>
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

            <View style={{ marginTop: 18 }}>
              <Pressable
                onPress={handleSignUp}
                disabled={loading}
                className={`flex-row gap-2 justify-center items-center p-4 w-full rounded-2xl h-[55px] bg-primary active:opacity-80 ${
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
                    <Icon name="ArrowRight" size={16} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.signinRow}>
              <BrText style={{ color: BR.ink3 }}>
                Already have an account?
              </BrText>
              <Pressable
                onPress={() => router.back()}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <BrText weight="semibold" color={BR.orangeDeep}>
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BR.line,
  },
  signinRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
});
