import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { Order, OrderStatus } from "@/lib/types";

export interface UpdateOrderDTO {
    id: string;
    name: string | null;
    creator_id: string | null;
    comments: string | null;
    status: OrderStatus | null;
    paused: boolean | null;
}

export async function updateOrderItem(
    orderInfo: UpdateOrderDTO
): Promise<Order> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(`Auth error: ${error.message}`);
    const userId = data.user?.id;
    if (!userId) throw new Error("No authenticated user");

    return apiFetch<Order, UpdateOrderDTO>(`/orders/${orderInfo.id}`, {
        method: "PATCH",
        body: orderInfo,
    });
}
