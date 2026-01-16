import { makeRedirectUri } from "expo-auth-session";

export type FieldState = {
    label: string;
    value: string;
    error: string | null;
    touched: boolean;
    show?: boolean;
};

export type FormState = {
    firstName?: FieldState;
    lastName?: FieldState;
    email?: FieldState;
    password?: FieldState;
    confirmPassword?: FieldState;
};

export function createFormHandlers(
    form: FormState,
    setForm: React.Dispatch<React.SetStateAction<FormState>>
) {
    function onChange<K extends keyof FormState>(key: K, value: string) {
        setForm((prev) => {
            const next = { ...prev };
            next[key] = {
                ...prev[key]!,
                value,
                // only validate once touched
                error: prev[key]!.touched
                    ? validateField(key, value, prev)
                    : prev[key]!.error,
            };
            return next;
        });
    }

    function onBlur<K extends keyof FormState>(key: K) {
        // mark touched and validate
        setForm((prev) => {
            const next = { ...prev };
            const field = prev[key];
            if (field) {
                next[key] = {
                    ...field,
                    touched: true,
                    error: validateField(key, field.value, prev),
                };
            }
            return next;
        });
    }

    return { onChange, onBlur };
}

export function validateField(
    key: keyof FormState,
    value: string,
    form: FormState
): string | null {
    const field = form[key];
    if (!field) return null;
    if (!value.trim()) return `${field.label} is required`;
    if (key === "email" && !validateEmail(value)) return "Email is invalid";
    if (key === "confirmPassword" && form["password"]!.value !== field.value)
        return "Confirm password does not match password";
    return null;
}

export function validateEmail(email: string) {
    const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;

    return emailRegex.test(email.trim());
}

export const redirectTo = makeRedirectUri({
    scheme: "biterunr",
    path: "auth/callback",
});

/**
 * Maps backend auth error messages to user-friendly messages.
 * Returns an object with the error message and which field it should be displayed on.
 */
export type AuthErrorResult = {
    message: string;
    field: "email" | "password" | "code" | "general";
    requiresVerification?: boolean;
};

export function getAuthErrorMessage(
    error: unknown,
    context: "signIn" | "signUp" | "verify" | "resetPassword" | "forgotPassword"
): AuthErrorResult {
    // Extract error message from various error formats
    let errorMessage = "";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === "string") {
        errorMessage = error;
    } else if (error && typeof error === "object") {
        // Handle Convex error format and other object shapes
        const errObj = error as Record<string, unknown>;
        if (typeof errObj.message === "string") {
            errorMessage = errObj.message;
        } else if (errObj.data && typeof (errObj.data as Record<string, unknown>).message === "string") {
            errorMessage = (errObj.data as Record<string, unknown>).message as string;
        } else {
            errorMessage = JSON.stringify(error);
        }
    }
    const lowerMessage = errorMessage.toLowerCase();

    // Sign In errors - use generic message to prevent account enumeration
    if (context === "signIn") {
        if (
            lowerMessage.includes("invalid password") ||
            lowerMessage.includes("wrong password") ||
            lowerMessage.includes("incorrect password") ||
            lowerMessage.includes("invalid secret") ||
            (lowerMessage.includes("password") && lowerMessage.includes("invalid")) ||
            (lowerMessage.includes("secret") && lowerMessage.includes("invalid")) ||
            lowerMessage.includes("user not found") ||
            lowerMessage.includes("no user") ||
            lowerMessage.includes("account not found") ||
            lowerMessage.includes("could not find") ||
            lowerMessage.includes("couldn't find")
        ) {
            // Generic message prevents attackers from determining if email exists
            return {
                message: "Invalid email or password.",
                field: "general",
            };
        }
        if (
            lowerMessage.includes("not verified") ||
            lowerMessage.includes("email verification") ||
            lowerMessage.includes("verify your email") ||
            lowerMessage.includes("email not verified")
        ) {
            return {
                message: "Please verify your email before signing in.",
                field: "email",
                requiresVerification: true,
            };
        }
        if (
            lowerMessage.includes("too many") ||
            lowerMessage.includes("rate limit")
        ) {
            return {
                message: "Too many attempts. Please try again later.",
                field: "general",
            };
        }
        if (lowerMessage.includes("invalid credentials")) {
            return {
                message: "Invalid email or password.",
                field: "general",
            };
        }
    }

    // Sign Up errors
    if (context === "signUp") {
        if (
            lowerMessage.includes("already exists") ||
            lowerMessage.includes("already registered") ||
            lowerMessage.includes("email in use") ||
            lowerMessage.includes("account already")
        ) {
            return {
                message: "An account with this email already exists.",
                field: "email",
            };
        }
        if (
            lowerMessage.includes("weak password") ||
            lowerMessage.includes("password too short") ||
            lowerMessage.includes("password requirements")
        ) {
            return {
                message: "Password is too weak. Use at least 8 characters.",
                field: "password",
            };
        }
    }

    // Email verification errors
    if (context === "verify") {
        if (
            lowerMessage.includes("invalid code") ||
            lowerMessage.includes("incorrect code") ||
            lowerMessage.includes("wrong code")
        ) {
            return {
                message: "Invalid verification code. Please check and try again.",
                field: "code",
            };
        }
        if (
            lowerMessage.includes("expired") ||
            lowerMessage.includes("code has expired")
        ) {
            return {
                message: "This code has expired. Please request a new one.",
                field: "code",
            };
        }
        if (
            lowerMessage.includes("too many") ||
            lowerMessage.includes("rate limit")
        ) {
            return {
                message: "Too many attempts. Please wait before trying again.",
                field: "code",
            };
        }
    }

    // Password reset errors
    if (context === "resetPassword") {
        if (
            lowerMessage.includes("invalid code") ||
            lowerMessage.includes("incorrect code") ||
            lowerMessage.includes("wrong code")
        ) {
            return {
                message: "Invalid reset code. Please check and try again.",
                field: "code",
            };
        }
        if (
            lowerMessage.includes("expired") ||
            lowerMessage.includes("code has expired")
        ) {
            return {
                message: "This code has expired. Please request a new one.",
                field: "code",
            };
        }
    }

    // Forgot password errors - use generic message to prevent account enumeration
    // Note: Ideally, the backend should always return success for forgot password
    // to prevent enumeration, but we handle it here as a fallback
    if (context === "forgotPassword") {
        if (
            lowerMessage.includes("user not found") ||
            lowerMessage.includes("no user") ||
            lowerMessage.includes("account not found")
        ) {
            // Don't reveal whether account exists - show generic success-like message
            return {
                message: "If an account exists with this email, you will receive a reset code.",
                field: "general",
            };
        }
    }

    // Default fallback
    return {
        message: errorMessage || "Something went wrong. Please try again.",
        field: "general",
    };
}

export function splitName(fullName: string | null | undefined): {
    firstName: string | null;
    lastName: string | null;
} {
    if (!fullName) return { firstName: null, lastName: null };

    let s = fullName.trim();

    s = s.replace(/([a-zà-öø-ÿ])([A-ZÀ-ÖØ-Þ])/g, "$1 $2");
    s = s.replace(/[.\-_]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();

    const STOP_WORDS = new Set([
        "mr",
        "mrs",
        "ms",
        "dr",
        "prof",
        "sir",
        "jr",
        "sr",
        "ii",
        "iii",
        "iv",
    ]);

    const tokens = s
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .filter((t) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(t))
        .filter((t) => !STOP_WORDS.has(t.toLowerCase()));

    if (tokens.length === 0) return { firstName: null, lastName: null };

    const titleCase = (word: string) =>
        word.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toLocaleUpperCase());

    const first = titleCase(tokens[0]);
    const last =
        tokens.length > 1 ? titleCase(tokens[tokens.length - 1]) : null;

    return { firstName: first, lastName: last };
}
