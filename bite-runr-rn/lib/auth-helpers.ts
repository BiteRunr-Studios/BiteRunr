import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { UserIdentity } from "@supabase/supabase-js";

export const PROVIDER_LOGOS = {
    google: "logo-google",
    github: "logo-github",
} as const;

export function getProviderLogos(identities: UserIdentity[]): string[] {
    return identities
        .filter((id) => id.provider in PROVIDER_LOGOS)
        .map(
            (id) => PROVIDER_LOGOS[id.provider as keyof typeof PROVIDER_LOGOS]
        );
}

export function hasOAuthProvider(identities: UserIdentity[]): boolean {
    return getProviderLogos(identities).length > 0;
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
