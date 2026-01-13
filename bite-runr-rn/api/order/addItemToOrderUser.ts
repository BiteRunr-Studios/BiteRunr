import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { SelectItemsAddExistingItemDTO } from "@/lib/types";

export async function addItemToOrderUser(
    itemInfo: SelectItemsAddExistingItemDTO
): Promise<SelectItemsAddExistingItemDTO> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<
        SelectItemsAddExistingItemDTO,
        SelectItemsAddExistingItemDTO
    >(`/orders/add_items_to_order_user`, {
        method: "POST",
        body: itemInfo,
    });
}
