import { SplashScreen, useRouter } from "expo-router";
import {
    createContext,
    PropsWithChildren,
    useEffect,
    useState,
    useCallback,
} from "react";
import { Platform } from "react-native";
import { authClient } from "./auth-client";
import * as WebBrowser from "expo-web-browser";

// Required for web browser auth sessions
WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

type PendingAuth = {
    email: string;
    firstName?: string;
    lastName?: string;
};

type AuthState = {
    isReady: boolean;
    isLoggedIn: boolean;
    isLoading: boolean;
    isSigningUp: boolean;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string | null;
        avatarStorageId?: string | null;
    } | null;
    // Email OTP flows
    sendOTP: (email: string, type: "sign-in" | "sign-up") => Promise<void>;
    verifyOTP: (email: string, otp: string) => Promise<void>;
    signUp: (params: {
        email: string;
        firstName: string;
        lastName: string;
    }) => Promise<void>;
    // OAuth
    signInWithOAuth: (provider: "github" | "google") => Promise<void>;
    // Sign out
    signOut: () => Promise<void>;
    // Pending auth state
    pendingAuth: PendingAuth | null;
    setPendingAuth: (auth: PendingAuth | null) => void;
};

export const AuthContext = createContext<AuthState>({
    isReady: false,
    isLoggedIn: false,
    isLoading: false,
    isSigningUp: false,
    user: null,
    sendOTP: async () => {},
    verifyOTP: async () => {},
    signUp: async () => {},
    signInWithOAuth: async () => {},
    signOut: async () => {},
    pendingAuth: null,
    setPendingAuth: () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
    const { data: session, isPending } = authClient.useSession();
    const [isReady, setIsReady] = useState(false);
    const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Wait for session to load
    useEffect(() => {
        if (!isPending) {
            setIsReady(true);
        }
    }, [isPending]);

    // Hide splash screen when ready
    useEffect(() => {
        if (isReady) {
            SplashScreen.hideAsync();
        }
    }, [isReady]);

    const sendOTP = useCallback(
        async (email: string, type: "sign-in" | "sign-up") => {
            setIsLoading(true);
            try {
                // Better Auth uses "email-verification" for sign-up flows
                const otpType = type === "sign-up" ? "email-verification" : type;
                const result = await authClient.emailOtp.sendVerificationOtp({
                    email,
                    type: otpType as "sign-in" | "email-verification" | "forget-password",
                });
                if (result.error) {
                    throw new Error(result.error.message ?? "Failed to send OTP");
                }
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const verifyOTP = useCallback(
        async (email: string, otp: string) => {
            setIsLoading(true);
            try {
                const result = await authClient.emailOtp.verifyEmail({
                    email,
                    otp,
                });
                if (result.error) {
                    throw new Error(result.error.message ?? "Failed to verify OTP");
                }
                // Clear pending auth after successful verification
                setPendingAuth(null);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const signUp = useCallback(
        async (params: {
            email: string;
            firstName: string;
            lastName: string;
        }) => {
            setIsSigningUp(true);
            setIsLoading(true);
            try {
                // Send OTP for email verification (sign-up)
                const result = await authClient.emailOtp.sendVerificationOtp({
                    email: params.email,
                    type: "email-verification",
                });
                if (result.error) {
                    throw new Error(result.error.message ?? "Failed to send verification code");
                }

                // Store pending auth for the verification page
                setPendingAuth({
                    email: params.email,
                    firstName: params.firstName,
                    lastName: params.lastName,
                });

                // Navigate to verification page
                router.push("/(auth)/confirm-sign-up");
            } finally {
                setIsSigningUp(false);
                setIsLoading(false);
            }
        },
        [router]
    );

    const signInWithOAuth = useCallback(
        async (provider: "github" | "google") => {
            setIsLoading(true);
            try {
                // Get the Convex site URL
                const convexCloudUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
                if (
                    Platform.OS !== "web" &&
                    (!convexCloudUrl || !convexCloudUrl.includes(".cloud"))
                ) {
                    throw new Error(
                        "EXPO_PUBLIC_CONVEX_URL must be set and contain '.cloud' for native OAuth"
                    );
                }
                const convexSiteUrl = convexCloudUrl?.replace(".cloud", ".site");
                const redirectUri = Platform.select({
                    native: `${convexSiteUrl}/mobile-callback`,
                    default: window.location.origin + "/",
                });
                const appSchemeUrl = "biterunr://oauth";

                // Use Better Auth's social sign-in
                const result = await authClient.signIn.social({
                    provider,
                    callbackURL: redirectUri,
                });

                if (result.error) {
                    throw new Error(result.error.message ?? "OAuth sign-in failed");
                }

                if (result.data?.url) {
                    // Open the OAuth provider in a web browser
                    const browserResult = await WebBrowser.openAuthSessionAsync(
                        result.data.url,
                        appSchemeUrl
                    );

                    if (browserResult.type === "success" && browserResult.url) {
                        // Parse the callback URL
                        const url = new URL(browserResult.url);
                        const code = url.searchParams.get("code");

                        if (code) {
                            // Complete the OAuth flow
                            // Better Auth handles this automatically through the callback
                        } else {
                            throw new Error(
                                "Authentication failed: no authorization code received"
                            );
                        }
                    } else if (browserResult.type === "cancel") {
                        throw new Error("Authentication was cancelled");
                    }
                }
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const signOut = useCallback(async () => {
        setIsLoading(true);
        try {
            await authClient.signOut();
            setPendingAuth(null);
            router.dismissTo("/(auth)/sign-in");
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    // Map session user to our user type
    const user = session?.user
        ? {
              id: session.user.id,
              email: session.user.email,
              firstName: (session.user as { firstName?: string }).firstName ?? "",
              lastName: (session.user as { lastName?: string }).lastName ?? "",
              avatarUrl: (session.user as { avatarUrl?: string | null }).avatarUrl,
              avatarStorageId: (session.user as { avatarStorageId?: string | null }).avatarStorageId,
          }
        : null;

    return (
        <AuthContext.Provider
            value={{
                isReady,
                isLoggedIn: !!session?.user,
                isLoading: isPending || isLoading,
                isSigningUp,
                user,
                sendOTP,
                verifyOTP,
                signUp,
                signInWithOAuth,
                signOut,
                pendingAuth,
                setPendingAuth,
            }}>
            {children}
        </AuthContext.Provider>
    );
}
