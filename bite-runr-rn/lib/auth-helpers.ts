import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";

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
    newPassword?: FieldState;
    confirmNewPassword?: FieldState;
};

export function createFormHandlers(
    form: FormState,
    setForm: React.Dispatch<React.SetStateAction<FormState>>,
    setHasChanged?: React.Dispatch<React.SetStateAction<boolean>>
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

            if (form && setHasChanged) {
                const hasChanged = Object.keys(next).some((k) => {
                    const formKey = k as keyof FormState;
                    return next[formKey]?.value !== form[formKey]?.value;
                });
                setHasChanged(hasChanged);
            }

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
    if (key !== "newPassword" && key !== "confirmNewPassword" && !value.trim())
        return `${field.label} is required`;
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

export async function createSessionFromUrl(url: string) {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token } = params;
    if (!access_token || !refresh_token) return;
    const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
    });
    if (error) throw error;
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
