import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
    type ReactNode,
} from "react";
import { authClient } from "./auth-client";
import type { Session, User } from "./auth-client";

type AuthState = {
    isReady: boolean;
    isLoading: boolean;
    isLoggedIn: boolean;
    isSigningUp: boolean;
    session: Session | null;
    user: User | null;
};

type AuthContextType = AuthState & {
    setIsSigningUp: (value: boolean) => void;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const defaultContext: AuthContextType = {
    isReady: false,
    isLoading: true,
    isLoggedIn: false,
    isSigningUp: false,
    session: null,
    user: null,
    setIsSigningUp: () => {},
    signOut: async () => {},
    refreshSession: async () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export function useAuth() {
    return useContext(AuthContext);
}

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [isSigningUp, setIsSigningUp] = useState(false);

    // Track if initial load has completed - once true, never goes back to false
    const hasInitialized = useRef(false);
    const [isReady, setIsReady] = useState(false);

    // Use Better Auth's useSession hook
    // Note: Convex auth token is handled by ConvexBetterAuthProvider in _layout.tsx
    const { data: sessionData, isPending } = authClient.useSession();

    // Mark as ready once initial loading completes (only once)
    useEffect(() => {
        if (!isPending && !hasInitialized.current) {
            hasInitialized.current = true;
            setIsReady(true);
        }
    }, [isPending]);

    const signOut = useCallback(async () => {
        try {
            await authClient.signOut();
        } catch (err) {
            console.error("Sign out error:", err);
            throw err;
        }
    }, []);

    const refreshSession = useCallback(async () => {
        // Force a session refresh by calling getSession
        await authClient.getSession();
    }, []);

    // Only show loading for the initial load, not for subsequent refetches
    const isInitialLoading = !hasInitialized.current && isPending;

    const value = useMemo<AuthContextType>(
        () => ({
            isReady,
            isLoading: isInitialLoading,
            isLoggedIn: !!sessionData?.session,
            isSigningUp,
            session: sessionData ?? null,
            user: sessionData?.user ?? null,
            setIsSigningUp,
            signOut,
            refreshSession,
        }),
        [isReady, isInitialLoading, sessionData, isSigningUp, signOut, refreshSession]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
