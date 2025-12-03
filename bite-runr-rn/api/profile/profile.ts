import { UserProfileType } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { splitName } from "@/lib/split-name";
import { Session, User } from "@supabase/supabase-js";

export async function fetchCurrentUser(): Promise<UserProfileType | null> {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const authUser = userData.user;
    if (!authUser) return null;

    const url = `https://biterunrapi-4bmpv.kinsta.app/users/${encodeURIComponent(
        authUser.id
    )}`;
    const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }
    return (await res.json()) as UserProfileType;
}

export async function findUserByEmail(
    email: string
): Promise<UserProfileType | null> {
    const url = `https://biterunrapi-4bmpv.kinsta.app/users/find-user-by-email?email=${email}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) return null;

    return (await response.json()) as UserProfileType;
}

export async function createUserProfile(
    user: any
): Promise<UserProfileType | null> {
    const url = `https://biterunrapi-4bmpv.kinsta.app/users/sso`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) return null;

    return (await response.json()) as UserProfileType;
}
