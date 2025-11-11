import {supabase} from "@/lib/supabase";
import {UserOrderDetails, UserProfileType} from "@/lib/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export type OrdersUserDetailsResponse = UserOrderDetails[];

export async function getUserOrdersDetails(): Promise<OrdersUserDetailsResponse> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    const url = `${API_URL}/orders/user/${userId}/details`;
    const res = await fetch(url);

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `Failed to fetch user orders: ${res.status} ${res.statusText} ${text}`
        );
    }

    return (await res.json()) as OrdersUserDetailsResponse;
}

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
