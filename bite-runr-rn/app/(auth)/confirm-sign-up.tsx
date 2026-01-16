import {
    View,
    Text,
    Image,
    Pressable,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
} from "react-native";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/lib/convex-auth-context";
import { getAuthErrorMessage } from "@/lib/auth-helpers";

export default function ConfirmSignUpScreen() {
    const {
        isLoggedIn,
        pendingAuth,
        setPendingAuth,
        verifyEmail,
        resendVerificationCode,
    } = useContext(AuthContext);

    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showResendPassword, setShowResendPassword] = useState(false);
    const [resendPassword, setResendPassword] = useState("");
    // Wait for context to stabilize before checking redirect
    const [isReady, setIsReady] = useState(false);

    // If user is already logged in (verified), redirect to protected tabs
    useEffect(() => {
        if (isLoggedIn) {
            router.replace("/(protected)/(tabs)");
        }
    }, [isLoggedIn]);

    // Wait a tick for context state to propagate before checking redirect
    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Cooldown timer for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(
                () => setResendCooldown(resendCooldown - 1),
                1000
            );
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // If no pending auth after context stabilizes, redirect to sign in
    if (isReady && !pendingAuth?.email) {
        return <Redirect href={"/sign-in"} />;
    }

    // Show loading while waiting for context
    if (!pendingAuth?.email) {
        return null;
    }

    const handleVerify = async () => {
        if (code.length !== 6) {
            setError("Please enter a 6-digit code");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await verifyEmail(code);
            // Navigation is handled by the useEffect watching isLoggedIn
        } catch (err: unknown) {
            const { message } = getAuthErrorMessage(err, "verify");
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendClick = () => {
        if (resendCooldown > 0) return;
        setShowResendPassword(true);
        setError(null);
    };

    const handleResendSubmit = async () => {
        if (!resendPassword) {
            setError("Please enter your password");
            return;
        }

        setResending(true);
        setError(null);

        try {
            await resendVerificationCode(resendPassword);
            setResendCooldown(60); // 60 second cooldown
            setShowResendPassword(false);
            setResendPassword("");
        } catch (err: unknown) {
            const { message } = getAuthErrorMessage(err, "verify");
            setError(message);
        } finally {
            setResending(false);
        }
    };

    const handleCancel = () => {
        setPendingAuth(null);
        router.dismissAll();
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView className="flex-1 px-6 justify-center items-center">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1 w-full items-center"
                >
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
                        Verify Your Email
                    </Text>

                    {/* Description */}
                    <Text className="text-center text-lg text-muted-foreground mb-2">
                        We sent a 6-digit code to
                    </Text>
                    <Text className="text-center text-lg font-semibold text-foreground mb-8">
                        {pendingAuth.email}
                    </Text>

                    {/* OTP Input */}
                    <View className="w-full mb-4">
                        <Input
                            value={code}
                            onChangeText={(text) => {
                                // Only allow digits, max 6 characters
                                const digits = text
                                    .replace(/\D/g, "")
                                    .slice(0, 6);
                                setCode(digits);
                                setError(null);
                            }}
                            placeholder="Enter 6-digit code"
                            leftIcon="KeyRound"
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                            errorMessage={error}
                        />
                    </View>

                    {/* Verify Button */}
                    <Button
                        variant="full"
                        label="Verify Email"
                        loading={loading}
                        onPress={handleVerify}
                    />

                    {/* Resend Code */}
                    {showResendPassword ? (
                        <View className="w-full mt-6">
                            <Text className="text-muted-foreground text-center mb-2">
                                Enter your password to resend the code
                            </Text>
                            <Input
                                value={resendPassword}
                                onChangeText={setResendPassword}
                                placeholder="Password"
                                leftIcon="Lock"
                                secureTextEntry
                                errorMessage=""
                            />
                            <View className="flex-row gap-2 mt-2">
                                <Pressable
                                    onPress={() => {
                                        setShowResendPassword(false);
                                        setResendPassword("");
                                    }}
                                    className="flex-1 py-2"
                                >
                                    <Text className="text-muted-foreground text-center">
                                        Cancel
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleResendSubmit}
                                    disabled={resending}
                                    className="flex-1 py-2"
                                >
                                    <Text className="text-primary font-semibold text-center">
                                        {resending ? "Sending..." : "Resend"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <View className="flex-row items-center justify-center mt-6 gap-1">
                            <Text className="text-muted-foreground">
                                Didn't receive the code?
                            </Text>
                            <Pressable
                                onPress={handleResendClick}
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
                                        ? `Resend in ${resendCooldown}s`
                                        : "Resend"}
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    <View className="flex-1" />

                    {/* Cancel link */}
                    <Pressable onPress={handleCancel} className="mb-4">
                        <Text className="text-muted-foreground">
                            Cancel and return to sign in
                        </Text>
                    </Pressable>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}
