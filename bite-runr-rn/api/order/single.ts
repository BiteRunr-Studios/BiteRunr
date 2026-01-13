import { supabase } from "@/lib/supabase";
import { AwaitingOrdersDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export async function getOrder(orderId: string): Promise<AwaitingOrdersDTO> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<AwaitingOrdersDTO>(`/orders/awaiting_order/${orderId}`);
}
