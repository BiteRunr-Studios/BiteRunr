import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { CreateOrderRequest, Friend, Location, Order } from "../types";
import { supabase } from "../supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function useLocations() {
    return useQuery({
        queryKey: ["locations"],
        queryFn: async () => {
            return apiFetch<Location[]>(`${API_URL}/locations`);
        },
    });
}

export function useFriends() {
    return useQuery({
        queryKey: ["friends"],
        queryFn: async () => {
            const { data } = await supabase.auth.getUser();
            if (!data.user?.id) throw new Error("No authenticated user");

            return apiFetch<Friend[]>(
                `${API_URL}/users/${data.user.id}/friends`
            );
        },
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData: {
            name: string;
            comments: string | null;
            locationIds: string[];
            friendIds: string[];
        }) => {
            const { data } = await supabase.auth.getUser();
            if (!data.user?.id) throw new Error("No authenticated user");

            const requestBody: CreateOrderRequest = {
                name: orderData.name,
                comments: orderData.comments,
                status: "active",
                paused: false,
                creator_id: data.user.id,
                order_locations: orderData.locationIds.map((locationId) => ({
                    order_id: "",
                    location_id: locationId,
                })),
                order_users: orderData.friendIds.map((friendId) => ({
                    order_id: "",
                    user_id: friendId,
                })),
            };

            return apiFetch<Order>(`${API_URL}/orders`, {
                method: "POST",
                body: requestBody,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
}
