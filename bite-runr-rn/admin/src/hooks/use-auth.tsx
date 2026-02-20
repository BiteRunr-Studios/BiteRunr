<<<<<<< ours
import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const SESSION_KEY = "admin_session_token";

async function hashToken(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getExpectedToken(): string {
  return `admin:${import.meta.env.VITE_ADMIN_PASSWORD}`;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    // We'll validate the stored token asynchronously on mount
    return sessionStorage.getItem(SESSION_KEY) !== null;
  });

  // Validate stored token on mount
  useState(() => {
    if (typeof window === "undefined") return;
    const storedHash = sessionStorage.getItem(SESSION_KEY);
    if (storedHash) {
      hashToken(getExpectedToken()).then((expected) => {
        if (storedHash !== expected) {
          sessionStorage.removeItem(SESSION_KEY);
          setIsAuthenticated(false);
        }
      });
    }
  });

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    if (
      username === "admin" &&
      password === import.meta.env.VITE_ADMIN_PASSWORD
    ) {
      const token = await hashToken(`admin:${password}`);
      sessionStorage.setItem(SESSION_KEY, token);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
|||||||
=======
import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("admin_authenticated") === "true";
  });

  const login = (username: string, password: string): boolean => {
    if (
      username === "admin" &&
      password === import.meta.env.VITE_ADMIN_PASSWORD
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
>>>>>>> theirs
