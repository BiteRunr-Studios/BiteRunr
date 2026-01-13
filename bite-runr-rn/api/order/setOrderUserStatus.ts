import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { SelectItemsOrderStatus } from "@/lib/types";

export async function setOrderUserStatus(
    orderId: string,
    status: SelectItemsOrderStatus
): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<string, SelectItemsOrderStatus>(
        `/orders/${orderId}/users/${userId}/change-status`,
        {
            method: "PATCH",
            body: status,
        }
    );
}
