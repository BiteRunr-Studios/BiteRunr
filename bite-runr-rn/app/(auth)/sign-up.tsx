import { useState, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { BrButton, BrInput, BrText } from "@/components/br";
import { OAuthButton } from "@/components/auth/oauth-button";
import {
  createFormHandlers,
  FormState,
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
      newForm.firstName = {
        ...newForm.firstName!,
        error: "First name is required",
        touched: true,
      };
      hasError = true;
    }
    if (!lastName) {
      newForm.lastName = {
        ...newForm.lastName!,
        error: "Last name is required",
        touched: true,
      };
      hasError = true;
    }
    if (!email) {
      newForm.email = {
        ...newForm.email!,
        error: "Email is required",
        touched: true,
      };
      hasError = true;
    } else if (!validateEmail(email)) {
      newForm.email = {
        ...newForm.email!,
        error: "Invalid email address",
        touched: true,
      };
      hasError = true;
    }
    if (!password) {
      newForm.password = {
        ...newForm.password!,
        error: "Password is required",
        touched: true,
      };
      hasError = true;
    } else if (password.length < 8) {
      newForm.password = {
        ...newForm.password!,
        error: "Must be at least 8 characters",
        touched: true,
      };
      hasError = true;
    }

    if (hasError) {
      setForm(newForm);
      return;
    }

    setLoading(true);
    setIsSigningUp(true);
    try {
      const response = await authClient.signUp.email({
        email: email!,
        password: password!,
        name: `${firstName} ${lastName}`.trim(),
      });
      if (response.error) {
        throw new Error(response.error.message || "Failed to create account");
      }
      await authClient.emailOtp.sendVerificationOtp({
        email: email!,
        type: "email-verification",
      });
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { email: email!, type: "sign-up" },
      });
    } catch (error) {
      setIsSigningUp(false);
      const errorResult = getAuthErrorMessage(error, "signUp");
      if (errorResult.field === "email") {
        setForm((prev) => ({
          ...prev,
          email: { ...prev.email!, error: errorResult.message, touched: true },
        }));
      } else if (errorResult.field === "password") {
        setForm((prev) => ({
          ...prev,
          password: {
            ...prev.password!,
            error: errorResult.message,
            touched: true,
          },
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
                One account for the whole crew. Order, scan, settle.
              </BrText>
            </View>

            <View style={{ marginTop: 24, gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <BrInput
                    value={form.firstName!.value}
                    placeholder="First name"
                    leftIcon="IdCard"
                    autoCapitalize="words"
                    returnKeyType="next"
                    errorMessage={form.firstName!.error}
                    onChangeText={(v) => onChange("firstName", v)}
                    onBlur={() => onBlur("firstName")}
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <BrInput
                    ref={lastNameRef}
                    value={form.lastName!.value}
                    placeholder="Last name"
                    leftIcon="IdCard"
                    autoCapitalize="words"
                    returnKeyType="next"
                    errorMessage={form.lastName!.error}
                    onChangeText={(v) => onChange("lastName", v)}
                    onBlur={() => onBlur("lastName")}
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </View>
              </View>

              <BrInput
                ref={emailRef}
                value={form.email!.value}
                placeholder="Email"
                leftIcon="Mail"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                errorMessage={form.email!.error}
                onChangeText={(v) => onChange("email", v)}
                onBlur={() => onBlur("email")}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <BrInput
                ref={passwordRef}
                value={form.password!.value}
                placeholder="Password (8+ chars)"
                leftIcon="Lock"
                secureTextEntry
                returnKeyType="done"
                errorMessage={form.password!.error}
                onChangeText={(v) => onChange("password", v)}
                onBlur={() => onBlur("password")}
                onSubmitEditing={handleSignUp}
              />
            </View>

            <View style={{ marginTop: 18 }}>
              <BrButton
                label="Continue"
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleSignUp}
                rightSlot={<Icon name="ArrowRight" size={16} color="#fff" />}
              />
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <BrText
                italic
                style={{ color: BR.ink3, fontSize: 12, paddingHorizontal: 12 }}
              >
                or sign up with
              </BrText>
              <View style={styles.dividerLine} />
            </View>

            <View style={{ gap: 10 }}>
              <OAuthButton provider="apple" disabled={loading} />
              <OAuthButton provider="google" disabled={loading} />
            </View>

            <View style={styles.signinRow}>
              <BrText style={{ color: BR.ink3 }}>Already have an account?</BrText>
              <Pressable
                onPress={() => router.back()}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Icon name="ArrowLeft" size={14} color={BR.orangeDeep} />
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
