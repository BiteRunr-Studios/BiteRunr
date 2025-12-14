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
                });

                // Handle password recovery - navigate to reset screen
                if (event === "PASSWORD_RECOVERY") {
                    hasNavigated.current = true;
                    router.push("/(auth)/reset-password");
                } else if (event === "SIGNED_OUT") {
                    // After sign out, allow normal navigation again
                    router.dismissTo("/(auth)/sign-in");
                    hasNavigated.current = false;
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
