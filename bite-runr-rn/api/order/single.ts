import { supabase } from "@/lib/supabase";
import { Order } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export async function getOrders(): Promise<Order[]> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<Order>(`/orders/user/${userId}`);
}
