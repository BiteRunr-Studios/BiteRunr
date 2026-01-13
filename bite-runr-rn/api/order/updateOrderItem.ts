import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

export interface UpdateOrderItemDTO {
    order_item_id: string;
    comments: string | null;
    quantity: number;
}

export async function updateOrderItem(
    itemInfo: UpdateOrderItemDTO
): Promise<UpdateOrderItemDTO> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<UpdateOrderItemDTO, UpdateOrderItemDTO>(
        `/orders/order-items/${itemInfo.order_item_id}`,
        {
            method: "PATCH",
            body: itemInfo,
        }
    );
}
