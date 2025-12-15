import { SplashScreen, useRouter } from "expo-router";
import {
    createContext,
    PropsWithChildren,
    useEffect,
    useRef,
    useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

SplashScreen.preventAutoHideAsync();

type AuthState = {
    session: Session | null;
    isReady: boolean;
    isLoggedIn: boolean;
    signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({
    session: null,
    isReady: false,
    isLoggedIn: false,
    signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
    const [isReady, setIsReady] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const router = useRouter();
    const hasNavigated = useRef(false);

    const signOut = async () => {
        await supabase.auth.signOut();
        hasNavigated.current = false;
    };

    useEffect(() => {
        let mounted = true;

        // Get initial session
        const initAuth = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                console.log("getSession on boot:", {
                    error,
                    session: data?.session,
                });

                if (!mounted) return;

                setSession(data?.session ?? null);
                setIsReady(true);
            } catch (error) {
                console.error("Error getting session:", error);
                if (mounted) {
                    setIsReady(true);
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: subscription } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                console.log("onAuthStateChange:", {
                    event,
                    session: newSession,
                    hasNavigated: hasNavigated.current,
                });

                // Handle password recovery - navigate to reset screen
                if (event === "PASSWORD_RECOVERY") {
                    console.log(
                        "PASSWORD_RECOVERY detected, navigating to reset-password"
                    );
                    hasNavigated.current = true;
                    router.replace("/(auth)/reset-password");
                } else if (event === "SIGNED_OUT") {
                    console.log(
                        "SIGNED_OUT detected, hasNavigated:",
                        hasNavigated.current
                    );
                    // Only navigate to sign-in if not during password recovery
                    if (!hasNavigated.current) {
                        console.log("Navigating to sign-in");
                        router.dismissTo("/(auth)/sign-in");
                    } else {
                        console.log(
                            "Skipping sign-in navigation (in recovery flow)"
                        );
                    }
                    // Don't reset hasNavigated here - let the password recovery flow complete
                }

                setSession(newSession ?? null);
            }
        );

        return () => {
            mounted = false;
            subscription.subscription?.unsubscribe();
        };
    }, []);

    // Hide splash screen when ready
    useEffect(() => {
        if (isReady) {
            SplashScreen.hideAsync();
        }
    }, [isReady]);

    return (
        <AuthContext.Provider
            value={{
                session,
                isReady,
                isLoggedIn: !!session,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
