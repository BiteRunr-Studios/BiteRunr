import { SplashScreen, useRouter } from "expo-router";
import {
    createContext,
    PropsWithChildren,
    useEffect,
    useState,
    useCallback,
} from "react";
import { Platform } from "react-native";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import * as WebBrowser from "expo-web-browser";

// Required for web browser auth sessions
WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

type PendingAuth = {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
};

type PendingPasswordReset = {
    email: string;
};

type AuthState = {
    isReady: boolean;
    isLoggedIn: boolean;
    isLoading: boolean;
    isSigningUp: boolean;
    signIn: (
        provider: "password" | "github" | "google",
        params?: {
            email?: string;
            password?: string;
            firstName?: string;
            lastName?: string;
            flow?: "signIn" | "signUp";
        }
    ) => Promise<void>;
    signUp: (params: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }) => Promise<void>;
    verifyEmail: (code: string) => Promise<void>;
    resendVerificationCode: () => Promise<void>;
    sendPasswordResetCode: (email: string) => Promise<void>;
    resetPassword: (code: string, newPassword: string) => Promise<void>;
    signOut: () => Promise<void>;
    pendingAuth: PendingAuth | null;
    setPendingAuth: (auth: PendingAuth | null) => void;
    pendingPasswordReset: PendingPasswordReset | null;
};

export const AuthContext = createContext<AuthState>({
    isReady: false,
    isLoggedIn: false,
    isLoading: false,
    isSigningUp: false,
    signIn: async () => {},
    signUp: async () => {},
    verifyEmail: async () => {},
    resendVerificationCode: async () => {},
    sendPasswordResetCode: async () => {},
    resetPassword: async () => {},
    signOut: async () => {},
    pendingAuth: null,
    setPendingAuth: () => {},
    pendingPasswordReset: null,
});

export function AuthProvider({ children }: PropsWithChildren) {
    const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
    const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
    const [isReady, setIsReady] = useState(false);
    const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
    const [pendingPasswordReset, setPendingPasswordReset] =
        useState<PendingPasswordReset | null>(null);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);
    const router = useRouter();

    // Wait for Convex auth to initialize
    useEffect(() => {
        if (!convexLoading) {
            setIsReady(true);
        }
    }, [convexLoading]);

    // Hide splash screen when ready
    useEffect(() => {
        if (isReady) {
            SplashScreen.hideAsync();
        }
    }, [isReady]);

    const signIn = useCallback(
        async (
            provider: "password" | "github" | "google",
            params?: {
                email?: string;
                password?: string;
                firstName?: string;
                lastName?: string;
                flow?: "signIn" | "signUp";
            }
        ) => {
            setIsSigningIn(true);
            try {
                if (provider === "password") {
                    const signInParams: Record<string, string> = {
                        flow: params?.flow ?? "signIn",
                    };
                    if (params?.email) signInParams.email = params.email;
                    if (params?.password)
                        signInParams.password = params.password;
                    if (params?.firstName)
                        signInParams.firstName = params.firstName;
                    if (params?.lastName)
                        signInParams.lastName = params.lastName;
                    await convexSignIn("password", signInParams);
                } else if (provider === "github" || provider === "google") {
                    // For React Native, use an intermediate web page that captures
                    // the auth code and redirects to the app scheme
                    const convexSiteUrl =
                        process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
                            ".cloud",
                            ".site"
                        );
                    const redirectUri = Platform.select({
                        // Use intermediate page for mobile to capture the code
                        native: `${convexSiteUrl}/mobile-callback`,
                        default: window.location.origin + "/",
                    });
                    // The app scheme URL that the intermediate page will redirect to
                    const appSchemeUrl = "biterunr://oauth";

                    // Get the authorization URL from Convex Auth
                    const { redirect } = await convexSignIn(provider, {
                        redirectTo: redirectUri,
                    });

                    if (redirect) {
                        // Open the OAuth provider in a web browser
                        // Listen for the app scheme URL (the intermediate page redirects to this)
                        const result = await WebBrowser.openAuthSessionAsync(
                            redirect.toString(),
                            appSchemeUrl
                        );

                        if (result.type === "success" && result.url) {
                            // Parse the callback URL and extract all params
                            const url = new URL(result.url);

                            const code = url.searchParams.get("code");

                            if (code) {
                                // Complete the OAuth flow with the code
                                await convexSignIn(provider, { code });
                            } else {
                                console.log("No code found in callback URL");
                            }
                        } else if (result.type === "cancel") {
                            throw new Error("Authentication was cancelled");
                        }
                    }
                }
            } finally {
                setIsSigningIn(false);
            }
        },
        [convexSignIn]
    );

    const signUp = useCallback(
        async (params: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
        }) => {
            setIsSigningUp(true);
            try {
                // Start sign-up flow - sends OTP email (doesn't authenticate yet)
                await convexSignIn("password", {
                    flow: "signUp",
                    email: params.email,
                    password: params.password,
                    firstName: params.firstName,
                    lastName: params.lastName,
                });

                // Store pending auth for the verification page
                setPendingAuth({
                    email: params.email,
                    password: params.password,
                    firstName: params.firstName,
                    lastName: params.lastName,
                });

                // Navigate to verification page
                router.push("/(auth)/confirm-sign-up");
            } finally {
                setIsSigningUp(false);
            }
        },
        [convexSignIn, router]
    );

    const verifyEmail = useCallback(
        async (code: string) => {
            if (!pendingAuth?.email) {
                throw new Error("No pending email verification");
            }

            // Complete email verification with the OTP code
            await convexSignIn("password", {
                flow: "email-verification",
                email: pendingAuth.email,
                code,
            });

            // Clear pending auth after successful verification
            setPendingAuth(null);
        },
        [convexSignIn, pendingAuth]
    );

    const resendVerificationCode = useCallback(async () => {
        if (!pendingAuth) {
            throw new Error("No pending email verification");
        }

        // Re-trigger the sign-up flow to resend the OTP
        const params: Record<string, string> = {
            flow: "signUp",
            email: pendingAuth.email,
            password: pendingAuth.password,
        };
        if (pendingAuth.firstName) params.firstName = pendingAuth.firstName;
        if (pendingAuth.lastName) params.lastName = pendingAuth.lastName;

        await convexSignIn("password", params);
    }, [convexSignIn, pendingAuth]);

    const sendPasswordResetCode = useCallback(
        async (email: string) => {
            // Initiate password reset flow - sends reset code email
            await convexSignIn("password", {
                flow: "reset",
                email,
            });

            // Store pending password reset for the reset page
            setPendingPasswordReset({ email });

            // Navigate to reset password page
            router.push({
                pathname: "/(auth)/reset-password",
                params: { email },
            });
        },
        [convexSignIn, router]
    );

    const resetPassword = useCallback(
        async (code: string, newPassword: string) => {
            if (!pendingPasswordReset?.email) {
                throw new Error("No pending password reset");
            }

            // Complete password reset with the OTP code and new password
            await convexSignIn("password", {
                flow: "reset-verification",
                email: pendingPasswordReset.email,
                code,
                newPassword,
            });

            // Clear pending password reset after successful reset
            setPendingPasswordReset(null);
        },
        [convexSignIn, pendingPasswordReset]
    );

    const signOut = useCallback(async () => {
        await convexSignOut();
        setPendingAuth(null);
        setPendingPasswordReset(null);
        router.dismissTo("/(auth)/sign-in");
    }, [convexSignOut, router]);

    return (
        <AuthContext.Provider
            value={{
                isReady,
                isLoggedIn: isAuthenticated,
                isLoading: convexLoading || isSigningIn,
                isSigningUp,
                signIn,
                signUp,
                verifyEmail,
                resendVerificationCode,
                sendPasswordResetCode,
                resetPassword,
                signOut,
                pendingAuth,
                setPendingAuth,
                pendingPasswordReset,
            }}>
            {children}
        </AuthContext.Provider>
    );
}
