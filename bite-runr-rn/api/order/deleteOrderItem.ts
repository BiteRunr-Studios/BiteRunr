import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { SelectItemsAddExistingItemDTO } from "@/lib/types";

export async function deleteOrderItem(
    order_item_id: string
): Promise<SelectItemsAddExistingItemDTO> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<SelectItemsAddExistingItemDTO>(
        `/orders/order-items/${order_item_id}`,
        {
            method: "DELETE",
        }
    );
}
