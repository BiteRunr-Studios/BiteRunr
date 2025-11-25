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

export async function createUserProfileFromSession(
    session: Session
): Promise<UserProfileType | null> {
    if (!session?.user) return null;

    const authUser = session.user;

    const meta = authUser.user_metadata as {
        name?: string;
        full_name?: string;
        preferred_username?: string;
        avatar_url?: string;
        picture?: string;
    };

    const fullName =
        meta?.name ??
        meta?.full_name ??
        (typeof meta?.preferred_username === "string"
            ? meta.preferred_username.replace(/[_\-\.]+/g, " ")
            : undefined) ??
        null;

    const { firstName, lastName } = splitName(fullName);
    const avatarUrl = meta?.avatar_url ?? meta?.picture ?? null;

    const url = "https://biterunrapi-4bmpv.kinsta.app/users/sso";
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: authUser.id,
            first_name: firstName ?? "",
            last_name: lastName ?? "",
            avatar_url: avatarUrl,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }

    return (await res.json()) as UserProfileType;
}

export async function createUserProfile(user: UserProfileType) {
    const url = "https://biterunrapi-4bmpv.kinsta.app/users/sso";
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: user.id,
            first_name: user.profile?.first_name ?? "",
            last_name: user.profile?.last_name ?? "",
            avatar_url: null,
        }),
    });

    return response;
}

export async function findUserProfile(id: string) {
    const url = `https://biterunrapi-4bmpv.kinsta.app/users/${id}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    });

    return response;
}
