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

type AuthState = {
    isReady: boolean;
    isLoggedIn: boolean;
    isLoading: boolean;
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
    signOut: () => Promise<void>;
    pendingAuth: PendingAuth | null;
    setPendingAuth: (auth: PendingAuth | null) => void;
};

export const AuthContext = createContext<AuthState>({
    isReady: false,
    isLoggedIn: false,
    isLoading: false,
    signIn: async () => {},
    signOut: async () => {},
    pendingAuth: null,
    setPendingAuth: () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
    const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
    const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
    const [isReady, setIsReady] = useState(false);
    const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
    const [isSigningIn, setIsSigningIn] = useState(false);
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

    const signOut = useCallback(async () => {
        await convexSignOut();
        setPendingAuth(null);
        router.dismissTo("/(auth)/sign-in");
    }, [convexSignOut, router]);

    return (
        <AuthContext.Provider
            value={{
                isReady,
                isLoggedIn: isAuthenticated,
                isLoading: convexLoading || isSigningIn,
                signIn,
                signOut,
                pendingAuth,
                setPendingAuth,
            }}>
            {children}
        </AuthContext.Provider>
    );
}
