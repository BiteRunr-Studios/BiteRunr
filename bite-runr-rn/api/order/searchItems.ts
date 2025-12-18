import { supabase } from "@/lib/supabase";
import { SelectItemsItemDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export async function searchItems(
    locationId: string,
    query: string
): Promise<SelectItemsItemDTO[]> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<SelectItemsItemDTO[]>(
        `/items/${locationId}?searchQuery=${query}`
    );
}
