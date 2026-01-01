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
import { UserProfileType } from "@/lib/types";
import { findUserByEmail } from "@/api/profile/profile";

SplashScreen.preventAutoHideAsync();

type PendingAuth = {
    email: string;
    password: string;
};

type AuthState = {
    session: Session | null;
    userProfile: UserProfileType | null;
    isReady: boolean;
    isLoggedIn: boolean;
    signOut: () => Promise<void>;
    pendingAuth: PendingAuth | null;
    setPendingAuth: (auth: PendingAuth | null) => void;
    refreshUserProfile: () => Promise<void>; // Add this
};

export const AuthContext = createContext<AuthState>({
    session: null,
    userProfile: null,
    isReady: false,
    isLoggedIn: false,
    signOut: async () => {},
    pendingAuth: null,
    setPendingAuth: () => {},
    refreshUserProfile: async () => {}, // Add this
});

export function AuthProvider({ children }: PropsWithChildren) {
    const [isReady, setIsReady] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfileType | null>(
        null
    );
    const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
    const router = useRouter();
    const hasNavigated = useRef(false);

    const fetchUserProfile = async (session: Session) => {
        try {
            const email = session?.user.email!;
            const profile = await findUserByEmail(email);

            setUserProfile(profile);
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    };

    const refreshUserProfile = async () => {
        console.log("Refresh user profile");
        if (session?.user?.id) {
            await fetchUserProfile(session);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        hasNavigated.current = false;
        setUserProfile(null);
        setPendingAuth(null); // Clear pending auth on sign out
    };

    useEffect(() => {
        let mounted = true;

        // Get initial session
        const initAuth = async () => {
            try {
                const { data } = await supabase.auth.getSession();

                if (!mounted) return;

                setSession(data?.session ?? null);

                if (data?.session?.user?.id)
                    await fetchUserProfile(data.session!);

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
            async (event, newSession) => {
                // Handle password recovery - navigate to reset screen
                if (event === "PASSWORD_RECOVERY") {
                    hasNavigated.current = true;
                    router.replace("/(auth)/reset-password");
                } else if (event === "SIGNED_OUT") {
                    // Only navigate to sign-in if not during password recovery
                    if (!hasNavigated.current) {
                        router.dismissTo("/(auth)/sign-in");
                    }

                    setUserProfile(null);
                }

                setSession(newSession ?? null);
                fetchUserProfile(newSession!);
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
                userProfile,
                isReady,
                isLoggedIn: !!session,
                signOut,
                pendingAuth,
                setPendingAuth,
                refreshUserProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
