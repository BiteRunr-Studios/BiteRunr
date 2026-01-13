import { supabase } from "@/lib/supabase";
import { SelectItemsOrderUserLocationItemDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export async function getOrderUserLocationItems(
    orderUserId: string,
    orderLocationId: string
): Promise<SelectItemsOrderUserLocationItemDTO[]> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<SelectItemsOrderUserLocationItemDTO[]>(
        `/orders/locations/${orderLocationId}/users/${orderUserId}/items`
    );
}
