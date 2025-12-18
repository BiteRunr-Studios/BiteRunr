import {UserProfileType} from "@/lib/types";
import {supabase} from "@/lib/supabase";

export async function fetchCurrentUser(): Promise<UserProfileType | null> {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const authUser = userData.user;
    if (!authUser) return null;

    const url = `https://biterunrapi-4bmpv.kinsta.app/users/${encodeURIComponent(authUser.id)}`;
    const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }
    return (await res.json()) as UserProfileType;
}
