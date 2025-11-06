import { supabase } from "@/lib/supabase";
import { UserOrderDetails } from "@/lib/types";

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

    const json = (await res.json()) as OrdersUserDetailsResponse;
    return json;
}
