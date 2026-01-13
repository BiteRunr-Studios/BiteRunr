import { supabase } from "@/lib/supabase";
import { SelectItemsOrderLocationDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export async function getOrderLocationsForItemSelection(
    orderId: string
): Promise<SelectItemsOrderLocationDTO[]> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<SelectItemsOrderLocationDTO[]>(
        `/orders/${orderId}/locations`
    );
}
